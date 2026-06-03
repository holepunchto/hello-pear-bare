# filepicker

Browse a filesystem and pick a file. Directory reads happen through commands
(async), and the filesystem dependency is **injected** — so the framework core
never depends on `bare-fs`, and your file UIs are trivially testable.

[← all components](../README.md#components)

## Usage

```js
const { filepicker } = require('bare-tea')

class App {
  constructor() {
    this.fp = filepicker.create({ height: 14 }) // lazily requires bare-fs
  }
  init() {
    return this.fp.init()
  }
  update(msg) {
    if (msg.type === 'filepicker.select') {
      /* msg.path chosen */ return [this, null]
    }
    const [fp, cmd] = this.fp.update(msg)
    this.fp = fp
    return [this, cmd]
  }
  view() {
    return this.fp.view()
  }
}
```

## Dependency injection

The component never `require`s `bare-fs`/`bare-path` at module load. You either
pass them in, or `create()` lazily requires them — so importing the framework
pulls in nothing, and only constructing a real filepicker loads the filesystem.
The only surface used is `fs.readdir(dir, { withFileTypes: true }, cb)` and
`path.join` / `path.dirname`.

## Options

| Option       | Default                     | Description               |
| ------------ | --------------------------- | ------------------------- |
| `fs`         | lazy `require('bare-fs')`   | Filesystem implementation |
| `path`       | lazy `require('bare-path')` | Path implementation       |
| `cwd`        | `path.resolve('.')`         | Starting directory        |
| `height`     | `12`                        | Visible rows              |
| `showHidden` | `false`                     | Show dotfiles             |

## API

- `init()` → a command that reads the starting directory.
- `selectedPath()` — the chosen file path (once selected).

## Messages

- `{ type: 'filepicker.entries', dir, entries }` — a directory was read.
- `{ type: 'filepicker.error', dir, error }` — a read failed.
- `{ type: 'filepicker.select', path }` — a file was chosen.

## Keys

`↑`/`↓` (`k`/`j`) move, `enter`/`→` (`l`) open a directory or pick a file,
`backspace`/`←` (`h`) go up.

## Testing

`filepicker.mock(tree)` returns an in-memory `{ fs, path, root }` from a plain
object — keys are entry names, an object value is a directory, anything else a
file:

```js
const m = filepicker.mock({ docs: { 'a.md': null }, 'readme.txt': null })
const fp = filepicker.create({ fs: m.fs, path: m.path, cwd: m.root })
```

No real disk access — ideal for tests.
