// Tests for the list component: selection + clamping, scroll window follows the
// cursor, and filtering (incl. the embedded textinput, accept, and clear).
const { test } = require('brittle')
const { list, KeyMsg } = require('../lib/tea')

const typed = (ch) => new KeyMsg({ name: ch, sequence: ch, ctrl: false, meta: false, shift: false })
const named = (name) =>
  new KeyMsg({
    name,
    sequence: '\x1b[' + name,
    ctrl: false,
    meta: false,
    shift: false
  })

test('list: selection moves and clamps', (t) => {
  const l = list.create({ items: ['a', 'b', 'c'], height: 5 })

  t.is(l.selectedItem(), 'a', 'starts on first item')
  l.update(named('down'))
  t.is(l.selectedItem(), 'b', 'down advances selection')
  l.update(named('down'))
  l.update(named('down'))
  t.is(l.selectedItem(), 'c', 'clamps at last item')
  l.update(named('up'))
  t.is(l.selectedItem(), 'b', 'up moves back')
})

test('list: scroll window follows the selection', (t) => {
  const l = list.create({ items: ['a', 'b', 'c', 'd', 'e'], height: 2 })

  t.is(l.offset, 0, 'window starts at top')
  l.update(named('down')) // -> b, still visible (rows 0..1)
  t.is(l.offset, 0, 'no scroll while selection visible')
  l.update(named('down')) // -> c, must scroll
  t.is(l.offset, 1, 'window advances to keep selection visible')
  t.is(l.selectedItem(), 'c', 'selection correct after scroll')
})

test('list: filtering narrows items and manages selection', (t) => {
  const l = list.create({
    items: ['apple', 'apricot', 'banana', 'cherry'],
    height: 5
  })

  l.update(typed('/')) // enter filter mode (not inserted as text)
  t.ok(l.filtering, 'slash enters filter mode')

  for (const c of 'ap') l.update(typed(c))
  t.is(l.filter, 'ap', 'query captured by embedded textinput')
  t.is(l.visibleCount, 2, 'narrowed to matches')
  t.is(l.selectedItem(), 'apple', 'selection reset to first match')

  l.update(named('enter'))
  t.absent(l.filtering, 'enter exits filter mode')
  t.is(l.filter, 'ap', 'accepted filter is retained')
  t.is(l.visibleCount, 2, 'still filtered after accept')

  l.update(named('escape'))
  t.is(l.filter, '', 'esc clears the active filter')
  t.is(l.visibleCount, 4, 'all items visible again')
})

test('list: esc while filtering cancels back to full list', (t) => {
  const l = list.create({ items: ['apple', 'banana'], height: 5 })

  l.update(typed('/'))
  l.update(typed('b'))
  t.is(l.visibleCount, 1, 'filtered down')

  l.update(named('escape'))
  t.absent(l.filtering, 'esc leaves filter mode')
  t.is(l.visibleCount, 2, 'and restores the full list')
})
