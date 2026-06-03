// A filepicker demo: browse from the current directory and pick a file.
//
//   bare examples/filepicker.js
//
// ↑/↓ or j/k to move, ↵/→ to open a directory or pick a file, ⌫/← to go up,
// q to quit. Uses the real filesystem (bare-fs is lazily required by create()).
const { Program, quit, key, filepicker, style } = require('../lib/tea')

class App {
  constructor() {
    this.fp = filepicker.create({ height: 14 })
    this.picked = null
    this.width = 80
    this.height = 24
  }

  init() {
    return this.fp.init()
  }

  update(msg) {
    if (msg.type === 'filepicker.select') {
      this.picked = msg.path
      return [this, null]
    }
    if (msg.type === 'key' && key.matches(msg, 'q', 'ctrl+c')) return [this, quit]
    if (msg.type === 'resize') {
      this.width = msg.width
      this.height = msg.height
      this.fp.height = Math.max(3, this.height - 5)
      return [this, null]
    }
    const [fp, cmd] = this.fp.update(msg)
    this.fp = fp
    return [this, cmd]
  }

  view() {
    const box = style()
      .border(style.borders.rounded)
      .borderForeground('blue')
      .width(Math.max(30, this.width - 2))
      .render(this.fp.view())

    const footer = this.picked
      ? `  ✓ picked: ${this.picked}`
      : '  ↑/↓ move · ↵/→ open · ⌫/← up · q quit'

    return style.joinVertical(
      style.position.left,
      style().bold(true).foreground('magenta').render(' file picker'),
      box,
      footer
    )
  }
}

new Program(new App()).run()
