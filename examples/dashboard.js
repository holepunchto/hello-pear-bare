// A layout showcase: a filterable list and a scrollable detail pane, each in a
// rounded box, joined side by side under a title bar.
//
//   bare examples/dashboard.js
//
// ↑/↓ or j/k select (the detail follows), pgup/pgdn scroll the detail, / filter
// the list, q quits. Sizes itself from the resize Msg.
const { Program, quit, key, list, viewport, style } = require('../lib/tea')

const items = [
  {
    title: 'corestore',
    desc: 'A namespaced collection of hypercores. Corestore manages many cores under one storage root and handles their keys, replication and lifecycle so apps can treat them as a single unit.'
  },
  {
    title: 'hyperswarm',
    desc: 'A high-level API for finding and connecting to peers by topic. Hyperswarm does the hole-punching and connection management; you join a topic and get connections to others on it.'
  },
  {
    title: 'hypercore',
    desc: 'A secure, append-only log — the primitive everything is built on. Hypercore gives you verifiable, replicable streams of data identified by a public key.'
  },
  {
    title: 'hyperbee',
    desc: 'An append-only B-tree on top of a hypercore. Hyperbee provides ordered key/value storage with atomic batches and efficient range queries and snapshots.'
  },
  {
    title: 'hyperdrive',
    desc: 'A secure, real-time distributed filesystem built on hypercore and hyperbee. Hyperdrive stores files and their metadata so they can be replicated peer to peer.'
  },
  {
    title: 'bare',
    desc: 'A small, modular JavaScript runtime for desktop and mobile. Bare is what this whole TUI framework runs on — no Node required, just the bare-* primitives.'
  }
]

// Plain-text word wrap to a column width.
function wrap(text, w) {
  const out = []
  for (const para of String(text).split('\n')) {
    let line = ''
    for (const word of para.split(' ')) {
      if (line && line.length + 1 + word.length > w) {
        out.push(line)
        line = word
      } else {
        line = line ? line + ' ' + word : word
      }
    }
    out.push(line)
  }
  return out.join('\n')
}

const LIST_W = 22

class Dashboard {
  constructor() {
    this.list = list.create({ items, height: 10, width: LIST_W })
    this.detail = viewport.create({ width: 40, height: 10 })
    this.width = 0
    this.height = 0
    this._syncDetail()
  }

  _syncDetail() {
    const item = this.list.selectedItem()
    this.detail.setContent(item ? wrap(item.desc, this.detail.width) : '')
    this.detail.gotoTop()
  }

  _layout() {
    const bodyH = Math.max(3, this.height - 6)
    this.list.height = bodyH - 1 // +1 for the list's own count footer
    this.detail.height = bodyH
    // Fill the rest of the row: total - listBox(LIST_W+2) - gap(1) - detail border(2).
    this.detail.width = Math.max(10, this.width - LIST_W - 5)
    this._syncDetail()
  }

  update(msg) {
    if (msg.type === 'resize') {
      this.width = msg.width
      this.height = msg.height
      this._layout()
      return [this, null]
    }

    if (msg.type === 'key') {
      if (key.matches(msg, 'ctrl+c')) return [this, quit]
      if (!this.list.filtering && key.matches(msg, 'q')) return [this, quit]
      if (key.matches(msg, 'pageup', 'pagedown')) {
        const [vp] = this.detail.update(msg)
        this.detail = vp
        return [this, null]
      }
    }

    const before = this.list.selectedItem()
    const [l] = this.list.update(msg)
    this.list = l
    if (this.list.selectedItem() !== before) this._syncDetail()
    return [this, null]
  }

  view() {
    const listBox = style()
      .border(style.borders.rounded)
      .borderForeground('blue')
      .render(this.list.view())

    // Pin the box to the full pane width so the right border tracks the screen
    // edge instead of shrinking to the longest line of detail text.
    const detailBox = style()
      .width(this.detail.width)
      .border(style.borders.rounded)
      .borderForeground('gray')
      .render(this.detail.view())

    const body = style.joinHorizontal(style.position.top, listBox, ' ', detailBox)
    const title = style().bold(true).foreground('magenta').render('  bare-tea dashboard')
    const footer = style().faint(true).render('  ↑/↓ select · pgup/pgdn scroll · / filter · q quit')

    return style.joinVertical(style.position.left, title, '', body, '', footer)
  }
}

new Program(new Dashboard()).run()
