// Tests for the viewport component: scrolling, clamping, fixed-height output,
// and horizontal truncation.
const { test } = require('brittle')
const { viewport, KeyMsg } = require('../lib/tea')

const named = (name) =>
  new KeyMsg({
    name,
    sequence: '\x1b[' + name,
    ctrl: false,
    meta: false,
    shift: false
  })

test('viewport: scrolls by line and clamps at both ends', (t) => {
  const vp = viewport.create({ width: 10, height: 3 })
  vp.setContent(Array.from({ length: 6 }, (_, i) => 'line' + i).join('\n'))

  t.alike(vp.view().split('\n'), ['line0', 'line1', 'line2'], 'first window')
  t.ok(vp.atTop, 'starts at top')

  vp.update(named('down'))
  t.alike(vp.view().split('\n'), ['line1', 'line2', 'line3'], 'down scrolls one')

  for (let i = 0; i < 10; i++) vp.update(named('down'))
  t.ok(vp.atBottom, 'clamps at bottom')
  t.alike(vp.view().split('\n'), ['line3', 'line4', 'line5'], 'last window')

  vp.update(named('home'))
  t.ok(vp.atTop, 'home returns to top')
})

test('viewport: always emits height lines, truncated to width', (t) => {
  const vp = viewport.create({ width: 4, height: 3 })
  vp.setContent('abcdef') // one long line, no newlines

  const lines = vp.view().split('\n')
  t.is(lines.length, 3, 'pads short content up to height')
  t.is(lines[0], 'abcd', 'truncates long line to width')
  t.is(lines[1], '', 'missing rows are blank')
})

test('viewport: page and scrollPercent track position', (t) => {
  const vp = viewport.create({ height: 4 })
  vp.setContent(Array.from({ length: 12 }, (_, i) => 'r' + i).join('\n'))

  t.is(vp.scrollPercent, 0, 'top is 0%')
  vp.update(named('pagedown'))
  t.is(vp.yOffset, 4, 'page down moves by height')
  vp.update(named('end'))
  t.is(vp.scrollPercent, 1, 'bottom is 100%')
  t.is(vp.yOffset, vp.maxOffset, 'end lands on max offset')
})
