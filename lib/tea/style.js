// style — terminal layout & styling, in the spirit of Charm's lipgloss.
//
//   const { style } = require('./lib/tea')
//   style().bold(true).foreground('205').padding(1, 2).border(style.borders.rounded).render('hi')
//
// A Style is immutable and chainable: every setter returns a new Style, and
// render(text) applies the whole declaration in one pass — width/align, then
// padding, then text styling (so a background fills the padding), then border,
// then margin.
//
// Everything is built on visible-width measurement (`width`) that ignores ANSI
// escapes and counts wide glyphs as two cells — without that, borders and the
// join helpers would drift the instant styled text passes through them.
const { constants } = require('bare-ansi-escapes')
const ansi = require('./ansi')

const CSI = constants.CSI
const RESET = ansi.modifierReset

// ── width measurement ──────────────────────────────────────────────────────

const ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]/g
const ANSI_STICKY = /\x1b\[[0-9;?]*[A-Za-z]/y

function stripAnsi(str) {
  return String(str).replace(ANSI_RE, '')
}

// Cells occupied by a single code point: 0 for control/combining/zero-width,
// 2 for wide (CJK, fullwidth, most emoji), 1 otherwise. An approximation of
// wcwidth covering the ranges that actually show up in TUIs.
function charWidth(cp) {
  if (cp === 0) return 0
  if (cp < 32 || (cp >= 0x7f && cp < 0xa0)) return 0 // C0/C1 control
  if (isZeroWidth(cp)) return 0
  if (isWide(cp)) return 2
  return 1
}

function isZeroWidth(cp) {
  return (
    (cp >= 0x0300 && cp <= 0x036f) || // combining diacriticals
    (cp >= 0x1ab0 && cp <= 0x1aff) ||
    (cp >= 0x1dc0 && cp <= 0x1dff) ||
    (cp >= 0x20d0 && cp <= 0x20ff) || // combining marks for symbols
    (cp >= 0xfe20 && cp <= 0xfe2f) ||
    cp === 0x200b || // zero-width space
    (cp >= 0x200c && cp <= 0x200f) ||
    cp === 0xfeff
  )
}

function isWide(cp) {
  return (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
    (cp >= 0x2e80 && cp <= 0x303e) || // CJK radicals … punctuation
    (cp >= 0x3041 && cp <= 0x33ff) || // Hiragana … CJK compat
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Ext A
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified
    (cp >= 0xa000 && cp <= 0xa4cf) || // Yi
    (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul syllables
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK compat ideographs
    (cp >= 0xfe30 && cp <= 0xfe4f) || // CJK compat forms
    (cp >= 0xff00 && cp <= 0xff60) || // fullwidth forms
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1faff) || // emoji & symbols
    (cp >= 0x20000 && cp <= 0x3fffd) // CJK Ext B+
  )
}

// Visible width of a single line (no newlines expected here).
function lineWidth(line) {
  let w = 0
  for (const ch of stripAnsi(line)) w += charWidth(ch.codePointAt(0))
  return w
}

// Visible width of a block: the widest line.
function width(str) {
  let w = 0
  for (const line of String(str).split('\n')) w = Math.max(w, lineWidth(line))
  return w
}

// Line count of a block.
function height(str) {
  return String(str).split('\n').length
}

// Truncate to `w` visible cells, preserving (and closing) escape sequences.
function truncate(str, w) {
  if (w <= 0) return ''
  let out = ''
  let used = 0
  let sawAnsi = false
  let i = 0
  while (i < str.length) {
    if (str[i] === '\x1b') {
      ANSI_STICKY.lastIndex = i
      const m = ANSI_STICKY.exec(str)
      if (m) {
        out += m[0]
        sawAnsi = true
        i = ANSI_STICKY.lastIndex
        continue
      }
    }
    const cp = str.codePointAt(i)
    const ch = String.fromCodePoint(cp)
    const cw = charWidth(cp)
    if (used + cw > w) break
    out += ch
    used += cw
    i += ch.length
  }
  if (sawAnsi) out += RESET
  return out
}

// Pad (or truncate) a line to `w` cells, positioning content by `pos`
// (0 left, 0.5 center, 1 right).
function padLine(line, w, pos = 0) {
  const lw = lineWidth(line)
  if (lw > w) return truncate(line, w)
  const space = w - lw
  if (space === 0) return line
  if (pos <= 0) return line + ' '.repeat(space)
  if (pos >= 1) return ' '.repeat(space) + line
  const left = Math.floor(space * pos)
  return ' '.repeat(left) + line + ' '.repeat(space - left)
}

// ── colors ───────────────────────────────────────────────────────────────

const NAMED = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  default: 39,
  gray: 90,
  grey: 90,
  brightblack: 90,
  brightred: 91,
  brightgreen: 92,
  brightyellow: 93,
  brightblue: 94,
  brightmagenta: 95,
  brightcyan: 96,
  brightwhite: 97
}

// Resolve a color spec to SGR params. Accepts a named color, a 0–255 ANSI-256
// index (number or numeric string), or a #rgb / #rrggbb truecolor hex.
function colorParams(spec, bg) {
  if (spec == null || spec === '') return []
  const lead = bg ? 48 : 38

  if (typeof spec === 'number') return [lead, 5, spec & 255]

  const s = String(spec)
  if (s[0] === '#') {
    let hex = s.slice(1)
    if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c)
    const n = parseInt(hex, 16)
    return [lead, 2, (n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const name = s.toLowerCase()
  if (name in NAMED) return [bg ? NAMED[name] + 10 : NAMED[name]]
  if (/^\d+$/.test(s)) return [lead, 5, parseInt(s, 10) & 255]
  return []
}

function sgr(params) {
  return params.length ? CSI + params.join(';') + 'm' : ''
}

// ── borders ────────────────────────────────────────────────────────────────

const borders = {
  normal: {
    topLeft: '┌',
    top: '─',
    topRight: '┐',
    left: '│',
    right: '│',
    bottomLeft: '└',
    bottom: '─',
    bottomRight: '┘'
  },
  rounded: {
    topLeft: '╭',
    top: '─',
    topRight: '╮',
    left: '│',
    right: '│',
    bottomLeft: '╰',
    bottom: '─',
    bottomRight: '╯'
  },
  thick: {
    topLeft: '┏',
    top: '━',
    topRight: '┓',
    left: '┃',
    right: '┃',
    bottomLeft: '┗',
    bottom: '━',
    bottomRight: '┛'
  },
  double: {
    topLeft: '╔',
    top: '═',
    topRight: '╗',
    left: '║',
    right: '║',
    bottomLeft: '╚',
    bottom: '═',
    bottomRight: '╝'
  }
}

// ── positions ────────────────────────────────────────────────────────────

const position = { top: 0, left: 0, center: 0.5, right: 1, bottom: 1 }

// CSS-like side shorthand → [top, right, bottom, left].
function sides(args) {
  const a = args.map((n) => n || 0)
  if (a.length <= 1) return [a[0] || 0, a[0] || 0, a[0] || 0, a[0] || 0]
  if (a.length === 2) return [a[0], a[1], a[0], a[1]]
  if (a.length === 3) return [a[0], a[1], a[2], a[1]]
  return [a[0], a[1], a[2], a[3]]
}

// ── Style ────────────────────────────────────────────────────────────────

class Style {
  constructor(props = {}) {
    this.props = props
  }

  _with(patch) {
    return new Style({ ...this.props, ...patch })
  }

  bold(v = true) {
    return this._with({ bold: v })
  }
  faint(v = true) {
    return this._with({ faint: v })
  }
  italic(v = true) {
    return this._with({ italic: v })
  }
  underline(v = true) {
    return this._with({ underline: v })
  }
  strikethrough(v = true) {
    return this._with({ strikethrough: v })
  }
  reverse(v = true) {
    return this._with({ reverse: v })
  }

  foreground(c) {
    return this._with({ fg: c })
  }
  background(c) {
    return this._with({ bg: c })
  }

  width(n) {
    return this._with({ width: n })
  }
  height(n) {
    return this._with({ height: n })
  }
  align(pos) {
    return this._with({ align: pos })
  }
  alignVertical(pos) {
    return this._with({ alignV: pos })
  }

  padding(...v) {
    return this._with({ padding: sides(v) })
  }
  margin(...v) {
    return this._with({ margin: sides(v) })
  }

  border(chars, ...sidesOn) {
    const on = sidesOn.length ? sides(sidesOn).map(Boolean) : [true, true, true, true]
    return this._with({ border: chars, borderSides: on })
  }
  borderForeground(c) {
    return this._with({ borderFg: c })
  }

  // SGR for text styling, opened once per inner line and closed with RESET.
  _open() {
    const p = this.props
    const params = []
    if (p.bold) params.push(1)
    if (p.faint) params.push(2)
    if (p.italic) params.push(3)
    if (p.underline) params.push(4)
    if (p.reverse) params.push(7)
    if (p.strikethrough) params.push(9)
    params.push(...colorParams(p.fg, false))
    params.push(...colorParams(p.bg, true))
    return sgr(params)
  }

  render(text) {
    const p = this.props
    const pad = p.padding || [0, 0, 0, 0]
    const mar = p.margin || [0, 0, 0, 0]
    const align = p.align || 0
    let lines = String(text).split('\n')

    // A rectangular block is required once anything needs to fill horizontally.
    const block =
      !!p.border || p.bg != null || !!p.width || align !== 0 || pad[0] || pad[1] || pad[2] || pad[3]

    // 1. width + horizontal alignment
    const contentW = p.width || width(lines.join('\n'))
    if (block) lines = lines.map((l) => padLine(l, contentW, align))
    else lines = lines.map((l) => (lineWidth(l) > contentW ? truncate(l, contentW) : l))

    // 2. fixed height (vertical alignment)
    if (p.height) lines = fitHeight(lines, p.height, contentW, p.alignV || 0)

    // 3. horizontal + vertical padding
    const innerW = contentW + pad[1] + pad[3]
    if (pad[1] || pad[3]) {
      const l = ' '.repeat(pad[3])
      const r = ' '.repeat(pad[1])
      lines = lines.map((line) => l + line + r)
    }
    const blank = ' '.repeat(innerW)
    for (let i = 0; i < pad[0]; i++) lines.unshift(blank)
    for (let i = 0; i < pad[2]; i++) lines.push(blank)

    // 4. text styling — wraps padding too so a background fills the box
    const open = this._open()
    if (open) lines = lines.map((line) => open + line + RESET)

    // 5. border
    if (p.border) lines = applyBorder(lines, innerW, p.border, p.borderSides, p.borderFg)

    // 6. margin (transparent)
    if (mar[3] || mar[1]) {
      const l = ' '.repeat(mar[3])
      const r = ' '.repeat(mar[1])
      lines = lines.map((line) => l + line + r)
    }
    const fullW = width(lines.join('\n'))
    const marginBlank = ' '.repeat(fullW)
    for (let i = 0; i < mar[0]; i++) lines.unshift(marginBlank)
    for (let i = 0; i < mar[2]; i++) lines.push(marginBlank)

    return lines.join('\n')
  }
}

function fitHeight(lines, h, w, posV) {
  if (lines.length >= h) return lines.slice(0, h)
  const extra = h - lines.length
  const before = posV <= 0 ? 0 : posV >= 1 ? extra : Math.floor(extra * posV)
  const blank = ' '.repeat(w)
  return [...Array(before).fill(blank), ...lines, ...Array(extra - before).fill(blank)]
}

function applyBorder(lines, innerW, chars, on, fg) {
  const [t, r, b, l] = on
  const paint = (s) => {
    const params = colorParams(fg, false)
    return params.length ? sgr(params) + s + RESET : s
  }
  const out = []
  if (t) {
    out.push(paint((l ? chars.topLeft : '') + chars.top.repeat(innerW) + (r ? chars.topRight : '')))
  }
  const left = l ? paint(chars.left) : ''
  const right = r ? paint(chars.right) : ''
  for (const line of lines) out.push(left + line + right)
  if (b) {
    out.push(
      paint(
        (l ? chars.bottomLeft : '') + chars.bottom.repeat(innerW) + (r ? chars.bottomRight : '')
      )
    )
  }
  return out
}

// ── joins ──────────────────────────────────────────────────────────────────

// Place blocks side by side, aligning their differing heights by `pos`
// (0 top, 0.5 center, 1 bottom).
function joinHorizontal(pos, ...blocks) {
  const cols = blocks.map((b) => String(b).split('\n'))
  const widths = cols.map((lines) => width(lines.join('\n')))
  const h = Math.max(...cols.map((lines) => lines.length))

  const padded = cols.map((lines, i) => {
    const w = widths[i]
    const filled = lines.map((line) => padLine(line, w, 0))
    const extra = h - filled.length
    const before = pos <= 0 ? 0 : pos >= 1 ? extra : Math.floor(extra * pos)
    const blank = ' '.repeat(w)
    return [...Array(before).fill(blank), ...filled, ...Array(extra - before).fill(blank)]
  })

  const out = []
  for (let row = 0; row < h; row++) out.push(padded.map((c) => c[row]).join(''))
  return out.join('\n')
}

// Stack blocks vertically, aligning their differing widths by `pos`
// (0 left, 0.5 center, 1 right).
function joinVertical(pos, ...blocks) {
  const cols = blocks.map((b) => String(b).split('\n'))
  const w = Math.max(...cols.map((lines) => width(lines.join('\n'))))
  const out = []
  for (const lines of cols) {
    for (const line of lines) out.push(padLine(line, w, pos))
  }
  return out.join('\n')
}

// The public entry point is the `style` factory, with helpers attached.
function style() {
  return new Style()
}
style.Style = Style
style.borders = borders
style.position = position
style.joinHorizontal = joinHorizontal
style.joinVertical = joinVertical
style.width = width
style.height = height
style.truncate = truncate

module.exports = {
  style,
  Style,
  borders,
  position,
  joinHorizontal,
  joinVertical,
  width,
  height,
  truncate,
  stripAnsi
}
