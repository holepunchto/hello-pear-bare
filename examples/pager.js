// A pager built on the viewport component.
//
//   bare examples/pager.js
//
// Scrolls a long document within the terminal: ↑/↓ or j/k by line, pgup/pgdn
// and home/end, q to quit. The viewport is sized from the resize Msg so it
// always fills the screen minus a header/footer.
const { Program, quit, key, viewport } = require('../lib/tea')

const content = Array.from(
  { length: 120 },
  (_, i) => `${String(i + 1).padStart(3)}  the quick brown fox jumps over the lazy dog`
).join('\n')

class Pager {
  constructor() {
    this.vp = viewport.create()
  }

  update(msg) {
    if (msg.type === 'resize') {
      this.vp.width = msg.width
      this.vp.height = Math.max(1, msg.height - 2) // header + footer
      this.vp.setContent(content)
      return [this, null]
    }

    if (msg.type === 'key') {
      if (key.matches(msg, 'q', 'ctrl+c')) return [this, quit]
      const [vp] = this.vp.update(msg)
      this.vp = vp
    }
    return [this, null]
  }

  view() {
    const pct = Math.round(this.vp.scrollPercent * 100)
    return [` pager — ${pct}%   ↑/↓ · pgup/pgdn · home/end · q quit`, this.vp.view(), ''].join('\n')
  }
}

new Program(new Pager()).run()
