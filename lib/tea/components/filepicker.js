// filepicker — browse a filesystem and pick a file.
//
// Dependency-injected so the framework core stays filesystem-free: pass your
// own { fs, path } to create(), or let it lazily require('bare-fs') /
// require('bare-path') — that require only runs when you actually construct a
// filepicker, so consumers who don't use it never pull those modules in.
//
//   const fp = filepicker.create({ height: 12 })            // real fs
//   const fp = filepicker.create({ ...filepicker.mock(tree), cwd: '/' })  // tests
//
// Directory reads happen through Cmds (async), surfacing as Msgs:
//   { type: 'filepicker.entries', dir, entries }
//   { type: 'filepicker.error',   dir, error }
//   { type: 'filepicker.select',  path }   // a file was chosen
//
// The only fs surface used is fs.readdir(dir, { withFileTypes: true }, cb); the
// only path surface is path.join and path.dirname. The mock implements exactly
// that, so tests need no real I/O.
const key = require('../key')
const { style } = require('../style')

const dirStyle = (s) => style().foreground('cyan').render(s)
const selectedStyle = (s) => style().reverse(true).render(s)
const dim = (s) => style().faint(true).render(s)

const keys = {
  up: key.binding({ keys: ['up', 'k'], help: { key: '↑/k', desc: 'up' } }),
  down: key.binding({ keys: ['down', 'j'], help: { key: '↓/j', desc: 'down' } }),
  open: key.binding({ keys: ['enter', 'right', 'l'], help: { key: '↵', desc: 'open' } }),
  back: key.binding({ keys: ['backspace', 'left', 'h'], help: { key: '⌫', desc: 'up dir' } })
}

function listDir(fs, dir) {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, { withFileTypes: true }, (err, ents) => {
      if (err) return reject(err)
      resolve(ents.map((e) => ({ name: e.name, directory: e.isDirectory() })))
    })
  })
}

function sortEntries(entries, showHidden) {
  return entries
    .filter((e) => showHidden || !e.name.startsWith('.'))
    .sort((a, b) => {
      if (a.directory !== b.directory) return a.directory ? -1 : 1
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    })
}

class FilePicker {
  constructor(opts = {}) {
    this.fs = opts.fs
    this.path = opts.path
    this.cwd = opts.cwd
    this.height = opts.height || 12
    this.showHidden = !!opts.showHidden

    this.entries = []
    this.cursor = 0
    this.offset = 0
    this.selected = null
    this.error = null
    this.loading = true
  }

  init() {
    return this._read(this.cwd)
  }

  selectedPath() {
    return this.selected
  }

  // A Cmd that reads `dir` and resolves to an entries (or error) Msg.
  _read(dir) {
    const fs = this.fs
    const showHidden = this.showHidden
    return () =>
      listDir(fs, dir).then(
        (entries) => ({
          type: 'filepicker.entries',
          dir,
          entries: sortEntries(entries, showHidden)
        }),
        (err) => ({
          type: 'filepicker.error',
          dir,
          error: (err && err.message) || String(err)
        })
      )
  }

  update(msg) {
    if (!msg) return [this, null]

    if (msg.type === 'filepicker.entries' && msg.dir === this.cwd) {
      this.entries = msg.entries
      this.cursor = 0
      this.offset = 0
      this.loading = false
      this.error = null
      return [this, null]
    }
    if (msg.type === 'filepicker.error' && msg.dir === this.cwd) {
      this.error = msg.error
      this.entries = []
      this.loading = false
      return [this, null]
    }
    if (msg.type === 'key') return this._key(msg)
    return [this, null]
  }

  _key(msg) {
    if (key.matches(msg, keys.up)) this._move(-1)
    else if (key.matches(msg, keys.down)) this._move(1)
    else if (key.matches(msg, keys.back)) return this._open(this.path.dirname(this.cwd))
    else if (key.matches(msg, keys.open)) {
      const entry = this.entries[this.cursor]
      if (!entry) return [this, null]
      const full = this.path.join(this.cwd, entry.name)
      if (entry.directory) return this._open(full)
      this.selected = full
      return [this, () => ({ type: 'filepicker.select', path: full })]
    }
    return [this, null]
  }

  _open(dir) {
    this.cwd = dir
    this.loading = true
    return [this, this._read(dir)]
  }

  _move(delta) {
    if (!this.entries.length) return
    this.cursor = Math.max(0, Math.min(this.cursor + delta, this.entries.length - 1))
    if (this.cursor < this.offset) this.offset = this.cursor
    else if (this.cursor >= this.offset + this.height) {
      this.offset = this.cursor - this.height + 1
    }
  }

  view() {
    const out = [
      style()
        .bold(true)
        .render(this.cwd || '')
    ]
    const rows = []

    if (this.loading) rows.push(dim('  loading…'))
    else if (this.error) rows.push(dim('  ⚠ ' + this.error))
    else if (!this.entries.length) rows.push(dim('  (empty)'))
    else {
      const end = Math.min(this.offset + this.height, this.entries.length)
      for (let p = this.offset; p < end; p++) {
        const entry = this.entries[p]
        const label = entry.directory ? entry.name + '/' : entry.name
        const text = (p === this.cursor ? '› ' : '  ') + label
        rows.push(p === this.cursor ? selectedStyle(text) : entry.directory ? dirStyle(text) : text)
      }
    }
    while (rows.length < this.height) rows.push('')

    return out.concat(rows).join('\n')
  }
}

function create(opts = {}) {
  // Lazy require: only consumers that build a filepicker load bare-fs/bare-path.
  const fs = opts.fs || require('bare-fs')
  const path = opts.path || require('bare-path')
  const cwd = opts.cwd || path.resolve('.')
  return new FilePicker({ ...opts, fs, path, cwd })
}

// ── mock filesystem ──────────────────────────────────────────────────────
//
// filepicker.mock(tree) returns { fs, path, root } backed by a plain object:
// keys are entry names, an object value is a directory, anything else a file.
//
//   const m = filepicker.mock({ docs: { 'a.md': null }, 'readme.txt': null })
//   const fp = filepicker.create({ fs: m.fs, path: m.path, cwd: m.root })

const mockPath = {
  sep: '/',
  join: (...parts) => parts.join('/').replace(/\/{2,}/g, '/') || '/',
  dirname: (p) => {
    const segs = p.replace(/\/+$/, '').split('/')
    segs.pop()
    const d = segs.join('/')
    return d === '' ? '/' : d
  },
  basename: (p) => p.replace(/\/+$/, '').split('/').pop() || '/',
  resolve: (p) => p
}

function resolveNode(tree, root, p) {
  if (p === root) return tree
  let rel = p
  if (root !== '/' && p.startsWith(root)) rel = p.slice(root.length)
  const segs = rel.split('/').filter(Boolean)
  let node = tree
  for (const s of segs) {
    if (node && typeof node === 'object' && s in node) node = node[s]
    else return undefined
  }
  return node
}

function mock(tree, opts = {}) {
  const root = opts.root || '/'
  const fs = {
    readdir(dir, options, cb) {
      if (typeof options === 'function') cb = options
      const node = resolveNode(tree, root, dir)
      if (!node || typeof node !== 'object') {
        return cb(new Error('ENOTDIR: ' + dir))
      }
      const ents = Object.keys(node).map((name) => {
        const isDir = !!(node[name] && typeof node[name] === 'object')
        return { name, isDirectory: () => isDir }
      })
      cb(null, ents)
    }
  }
  return { fs, path: mockPath, root }
}

module.exports = { create, FilePicker, mock }
