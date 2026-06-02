// list — a selectable, filterable list.
//
// Selection + filtering live here; scrolling mirrors the viewport model — a
// window [offset, offset+height) over the (possibly filtered) items, nudged to
// keep the selection visible. Filtering is delegated to an embedded textinput,
// so the list is itself a composition of components.
//
// Items may be strings or objects: `title` is shown, `filterValue` (falling
// back to title) is matched. selectedItem() returns the underlying item.
const key = require('../key')
const ansi = require('../ansi')
const textinput = require('./textinput')

const reverse = (s) => ansi.modifierReverse + s + ansi.modifierNotReverse
const dim = (s) => ansi.modifierDim + s + ansi.modifierReset

const keys = {
  up: key.binding({ keys: ['up', 'k'], help: { key: '↑/k', desc: 'up' } }),
  down: key.binding({ keys: ['down', 'j'], help: { key: '↓/j', desc: 'down' } }),
  pageUp: key.binding({ keys: ['pageup'] }),
  pageDown: key.binding({ keys: ['pagedown'] }),
  filter: key.binding({ keys: ['/'], help: { key: '/', desc: 'filter' } }),
  accept: key.binding({ keys: ['enter'] }),
  cancel: key.binding({ keys: ['esc'], help: { key: 'esc', desc: 'clear filter' } })
}

function filterValue(item) {
  if (item == null) return ''
  if (typeof item === 'string') return item
  return item.filterValue || item.title || String(item)
}

function titleOf(item) {
  if (item == null) return ''
  if (typeof item === 'string') return item
  return item.title != null ? item.title : String(item)
}

class List {
  constructor(opts = {}) {
    this.items = opts.items ? opts.items.slice() : []
    this.height = opts.height || 10 // visible rows
    this.width = opts.width || 0
    this.title = opts.title || ''
    this.filterable = opts.filterable !== false

    this.input = textinput.create({ prompt: '' }) // filter query editor
    this.filter = ''
    this.filtering = false

    this.selected = 0 // position within `filtered`
    this.offset = 0 // top of the visible window
    this.filtered = this.items.map((_, i) => i) // original indices that match
  }

  get visibleCount() {
    return this.filtered.length
  }

  selectedItem() {
    if (!this.filtered.length) return null
    return this.items[this.filtered[this.selected]]
  }

  setItems(items) {
    this.items = items.slice()
    this._applyFilter()
    return this
  }

  update(msg) {
    if (!msg || msg.type !== 'key') return [this, null]

    // While filtering, keys edit the query; esc cancels, enter accepts.
    if (this.filtering) {
      if (key.matches(msg, keys.cancel)) {
        this.filtering = false
        this.filter = ''
        this.input.reset().blur()
        this._applyFilter()
        return [this, null]
      }
      if (key.matches(msg, keys.accept)) {
        this.filtering = false
        this.input.blur()
        return [this, null]
      }
      const [input, cmd] = this.input.update(msg)
      this.input = input
      this.filter = this.input.value
      this._applyFilter()
      return [this, cmd]
    }

    if (this.filterable && key.matches(msg, keys.filter)) {
      this.filtering = true
      this.input.focus()
      return [this, null]
    }
    if (key.matches(msg, keys.cancel) && this.filter) {
      this.filter = ''
      this.input.reset()
      this._applyFilter()
      return [this, null]
    }

    if (key.matches(msg, keys.up)) this._move(-1)
    else if (key.matches(msg, keys.down)) this._move(1)
    else if (key.matches(msg, keys.pageUp)) this._move(-this.height)
    else if (key.matches(msg, keys.pageDown)) this._move(this.height)

    return [this, null]
  }

  _applyFilter() {
    const q = this.filter.trim().toLowerCase()
    const all = this.items.map((_, i) => i)
    this.filtered = q
      ? all.filter((i) => filterValue(this.items[i]).toLowerCase().includes(q))
      : all
    // Filtering changes what's under the cursor, so reset to the first match.
    this.selected = 0
    this.offset = 0
  }

  _move(delta) {
    if (!this.filtered.length) return
    const last = this.filtered.length - 1
    this.selected = Math.max(0, Math.min(this.selected + delta, last))
    if (this.selected < this.offset) this.offset = this.selected
    else if (this.selected >= this.offset + this.height) {
      this.offset = this.selected - this.height + 1
    }
  }

  view() {
    const lines = []
    if (this.title) lines.push(this.title)
    if (this.filtering || this.filter) {
      lines.push('/' + (this.filtering ? this.input.view() : this.filter))
    }

    const rows = []
    if (!this.filtered.length) {
      rows.push(dim('  no matches'))
    } else {
      const end = Math.min(this.offset + this.height, this.filtered.length)
      for (let p = this.offset; p < end; p++) {
        const item = this.items[this.filtered[p]]
        rows.push(this._renderRow(titleOf(item), p === this.selected))
      }
    }
    while (rows.length < this.height) rows.push('') // stable height
    lines.push(...rows)

    const pos = this.filtered.length ? this.selected + 1 : 0
    lines.push(dim(`  ${pos}/${this.filtered.length}`))
    return lines.join('\n')
  }

  _renderRow(label, selected) {
    let line = (selected ? '› ' : '  ') + label
    if (this.width > 0) line = line.slice(0, this.width).padEnd(this.width)
    return selected ? reverse(line) : line
  }
}

function create(opts) {
  return new List(opts)
}

module.exports = { create, List, keys }
