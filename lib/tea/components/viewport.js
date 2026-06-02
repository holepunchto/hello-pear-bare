// viewport — a scrollable window over content taller than the available space.
//
// Holds its content as lines and renders a fixed `height`-row window starting
// at `yOffset`. It always emits exactly `height` lines (padding short content),
// which keeps the surrounding layout stable for the diff renderer. Long lines
// are truncated to `width`.
//
// Useful on its own (a pager, a scrollable log/help panel) and as the scrolling
// concept the list component mirrors.
const key = require('../key')

// Scroll keymap, expressed as reusable bindings.
const keys = {
  up: key.binding({ keys: ['up', 'k'], help: { key: '↑/k', desc: 'up' } }),
  down: key.binding({ keys: ['down', 'j'], help: { key: '↓/j', desc: 'down' } }),
  pageUp: key.binding({ keys: ['pageup', 'b'], help: { key: 'pgup', desc: 'page up' } }),
  pageDown: key.binding({ keys: ['pagedown', 'f'], help: { key: 'pgdn', desc: 'page down' } }),
  halfUp: key.binding({ keys: ['ctrl+u'] }),
  halfDown: key.binding({ keys: ['ctrl+d'] }),
  top: key.binding({ keys: ['home'], help: { key: 'home', desc: 'top' } }),
  bottom: key.binding({ keys: ['end'], help: { key: 'end', desc: 'bottom' } })
}

class Viewport {
  constructor(opts = {}) {
    this.width = opts.width || 0 // 0 = no horizontal truncation
    this.height = opts.height || 0
    this.yOffset = 0
    this.lines = []
  }

  setContent(content) {
    this.lines = String(content).split('\n')
    this._clamp()
    return this
  }

  get maxOffset() {
    return Math.max(0, this.lines.length - this.height)
  }
  get atTop() {
    return this.yOffset <= 0
  }
  get atBottom() {
    return this.yOffset >= this.maxOffset
  }
  get scrollPercent() {
    if (this.lines.length <= this.height) return 1
    return this.yOffset / this.maxOffset
  }

  setYOffset(n) {
    this.yOffset = n
    this._clamp()
    return this
  }
  scrollUp(n = 1) {
    return this.setYOffset(this.yOffset - n)
  }
  scrollDown(n = 1) {
    return this.setYOffset(this.yOffset + n)
  }
  gotoTop() {
    return this.setYOffset(0)
  }
  gotoBottom() {
    return this.setYOffset(this.maxOffset)
  }

  _clamp() {
    this.yOffset = Math.max(0, Math.min(this.yOffset, this.maxOffset))
  }

  update(msg) {
    if (!msg || msg.type !== 'key') return [this, null]
    const h = this.height || 1

    if (key.matches(msg, keys.up)) this.scrollUp(1)
    else if (key.matches(msg, keys.down)) this.scrollDown(1)
    else if (key.matches(msg, keys.pageUp)) this.scrollUp(h)
    else if (key.matches(msg, keys.pageDown)) this.scrollDown(h)
    else if (key.matches(msg, keys.halfUp)) this.scrollUp(Math.ceil(h / 2))
    else if (key.matches(msg, keys.halfDown)) this.scrollDown(Math.ceil(h / 2))
    else if (key.matches(msg, keys.top)) this.gotoTop()
    else if (key.matches(msg, keys.bottom)) this.gotoBottom()

    return [this, null]
  }

  view() {
    const out = []
    for (let i = 0; i < this.height; i++) {
      const line = this.lines[this.yOffset + i] ?? ''
      out.push(this.width > 0 ? line.slice(0, this.width) : line)
    }
    return out.join('\n')
  }
}

function create(opts) {
  return new Viewport(opts)
}

module.exports = { create, Viewport, keys }
