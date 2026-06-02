// Tests for the style/layout layer. Measurement is the foundation, so it's
// covered hardest; rendering and joins are asserted on their stripped (visible)
// shape plus rectangularity (every line the same visible width).
const { test } = require('brittle')
const {
  style,
  borders,
  position,
  joinHorizontal,
  joinVertical,
  width,
  height,
  truncate,
  stripAnsi
} = require('../lib/tea/style')

// Visible widths of every line in a block.
const widths = (block) => block.split('\n').map(width)
// True if every line has the same visible width (a proper rectangle).
const rectangular = (block) => new Set(widths(block)).size === 1

test('width: ignores ANSI and counts wide/zero-width glyphs', (t) => {
  t.is(width('abc'), 3, 'plain ascii')
  t.is(width('\x1b[1m\x1b[31mabc\x1b[0m'), 3, 'ignores SGR sequences')
  t.is(width('世界'), 4, 'CJK glyphs are two cells each')
  t.is(width('é'), 1, 'combining accent adds no width')
  t.is(width('a\nbbb\ncc'), 3, 'block width is the widest line')
  t.is(height('a\nb\nc'), 3, 'height is the line count')
})

test('truncate: clips to visible cells and closes escapes', (t) => {
  t.is(truncate('abcdef', 3), 'abc', 'plain truncation')
  t.is(width(truncate('\x1b[31mabcdef\x1b[0m', 3)), 3, 'truncates visible width')
  t.ok(truncate('\x1b[31mabcdef', 3).endsWith('\x1b[0m'), 'reopened style is reset')
  t.is(truncate('世界世', 3), '世', 'never splits a wide glyph past the limit')
})

test('style: text decoration wraps content but does not change width', (t) => {
  const out = style().bold(true).foreground('red').render('hi')
  t.is(stripAnsi(out), 'hi', 'visible text unchanged')
  t.ok(out.includes('\x1b['), 'emits SGR codes')
  t.ok(out.endsWith('\x1b[0m'), 'resets at the end')
})

test('style: width pads and aligns', (t) => {
  t.is(stripAnsi(style().width(5).render('hi')), 'hi   ', 'left-pads to width')
  t.is(stripAnsi(style().width(5).align(position.right).render('hi')), '   hi', 'right alignment')
  t.is(stripAnsi(style().width(5).align(position.center).render('hi')), ' hi  ', 'center alignment')
})

test('style: padding adds inner space on every side', (t) => {
  const out = style().padding(1, 2).render('x')
  const lines = out.split('\n')
  t.is(lines.length, 3, 'top + content + bottom rows')
  t.is(stripAnsi(lines[1]), '  x  ', 'left/right padding around content')
  t.ok(rectangular(out), 'all rows share one width')
  t.is(width(out), 5, 'width = content + 2*horizontal padding')
})

test('style: border boxes the content', (t) => {
  const out = style().border(borders.normal).render('hi')
  const lines = out.split('\n').map(stripAnsi)
  t.is(lines.length, 3, 'top, content, bottom')
  t.is(lines[0], '┌──┐', 'top edge spans content width')
  t.is(lines[1], '│hi│', 'sides hug the content')
  t.is(lines[2], '└──┘', 'bottom edge')
  t.ok(rectangular(out), 'box is rectangular')
})

test('style: padding + border compose (border outside padding)', (t) => {
  const out = style().padding(0, 1).border(borders.rounded).render('hi')
  const lines = out.split('\n').map(stripAnsi)
  t.is(lines[0], '╭────╮', 'inner width = content(2) + padding(2)')
  t.is(lines[1], '│ hi │', 'padding sits inside the border')
  t.ok(rectangular(out), 'still rectangular')
})

test('joinHorizontal: aligns differing heights, concatenates rows', (t) => {
  const left = 'a\nb\nc' // 3 tall, 1 wide
  const right = 'XX' // 1 tall, 2 wide
  const out = joinHorizontal(position.top, left, right)
  const lines = out.split('\n')

  t.is(lines.length, 3, 'height is the taller block')
  t.ok(rectangular(out), 'rows are equal width')
  t.is(width(out), 3, 'width is the sum of block widths')
  t.is(stripAnsi(lines[0]), 'aXX', 'top-aligned right block sits on row 0')
  t.is(stripAnsi(lines[2]), 'c  ', 'shorter block padded below')
})

test('joinVertical: equalizes widths by alignment', (t) => {
  const out = joinVertical(position.center, 'xx', 'yyyy')
  const lines = out.split('\n').map(stripAnsi)
  t.ok(rectangular(out), 'all lines padded to widest')
  t.is(lines[0], ' xx ', 'narrow line centered under the wide one')
  t.is(lines[1], 'yyyy', 'widest line unchanged')
})

test('style: borders/joins stay aligned through styled component-like text', (t) => {
  // A reverse-video "selected row" like the list emits — width must be measured
  // as 3, not inflated by the escape codes, so the box still closes correctly.
  const row = '\x1b[7msel\x1b[27m'
  const out = style().border(borders.normal).render(row)
  t.ok(rectangular(out), 'box around styled content is rectangular')
  t.is(width(out), 5, 'content(3) + 2 border columns')
})
