---
name: tea-tui
description: >-
  Build terminal UIs with this project's `lib/tea` framework — a Bubble
  Tea-style Elm Architecture runtime (Model/Update/View, Cmd/Msg, Program) on
  Bare's native primitives. Use when the user wants to create or change a TUI /
  terminal interface, asks which components fit a described UI, or needs to add a
  new tea component. Triggers: "build a TUI", "terminal UI", "tea component",
  "make a <list/form/dashboard/picker> screen", mentions of lib/tea or Program.
---

# Building TUIs with `lib/tea`

`lib/tea` is a small Elm Architecture runtime + component set for the terminal,
shaped after Charm's Bubble Tea, running on Bare (no Node deps). Everything is
imported from `require('./lib/tea')` (adjust the relative path).

## The core loop (always the same)

A **model** is any object with three methods. The **Program** runs it.

```js
const { Program, quit, key } = require('./lib/tea')

class App {
  init() {
    return null
  } // optional: a startup Cmd
  update(msg) {
    // fold a Msg into new state
    if (key.matches(msg, 'q', 'ctrl+c')) return [this, quit]
    return [this, null] // return [model, cmd]
  }
  view() {
    return 'press q to quit'
  } // render to a string
}

new Program(new App()).run()
```

- **Msg** — a tagged value flowing into `update`. Built-ins: `{type:'key'}`
  (a `KeyMsg`), `{type:'resize', width, height}`, `{type:'mouse', ...}`, plus
  component msgs (e.g. `spinner.tick`, `timer.timeout`, `filepicker.select`).
- **Cmd** — `() => Msg | Promise<Msg> | null`, run off the update path; its
  result is dispatched back into `update`. Built-ins: `quit`, `batch(...cmds)`
  (concurrent), `sequence(...cmds)` (ordered), `tick(ms, fn)`, `every(ms, fn)`.
- **Keys** — `key.matches(msg, 'enter', 'ctrl+c', someBinding)` is null/type
  safe. `msg.is('q')` / `String(msg)` also work. Define reusable bindings with
  `key.binding({ keys: ['up','k'], help: { key: '↑/k', desc: 'up' } })`.

`update` returns `[model, cmd]` (or just `model`). Mutating `this` and returning
`[this, cmd]` is the idiomatic style here.

Read `lib/tea/index.js` for the full export list, and the source of any
component before using it — the files are short and the doc comment at the top
of each explains its API.

## Composition (parent hosts children)

Components are themselves models. A parent holds them as fields, routes Msgs in,
and threads their Cmds up to the Program:

```js
update (msg) {
  if (msg.type === 'spinner.tick') {            // route component msgs
    const [s, cmd] = this.spinner.update(msg)
    this.spinner = s
    return [this, cmd]                          // thread the Cmd up
  }
  ...
}
view () { return this.spinner.view() + ' loading' }
```

## Pick components for a described UI

| The user wants…                   | Use                                          | Notes                                                |
| --------------------------------- | -------------------------------------------- | ---------------------------------------------------- |
| a busy/loading indicator          | `spinner`                                    | Cmd-driven; `init()` starts it, route `spinner.tick` |
| a one-line text field             | `textinput`                                  | `password` echo, `charLimit`, `placeholder`          |
| a multi-line editor               | `textarea`                                   | soft-wrap, visual up/down, scroll                    |
| a selectable list / menu          | `list`                                       | built-in `/` filter, `selectedItem()`                |
| a searchable picker               | `list` (filterable)                          | items are strings or `{title, filterValue}`          |
| tabular data with columns         | `table`                                      | `{columns:[{title,width}], rows:[[...]]}`            |
| scroll long text / logs / a pager | `viewport`                                   | `setContent(str)`, `scrollPercent`                   |
| keybinding hints / a help bar     | `help`                                       | renders `key.binding` metadata; `?` toggles full     |
| a progress / download bar         | `progress`                                   | `view(percent 0..1)`, gradient fill                  |
| page through many items           | `paginator`                                  | `sliceBounds()` + dots/arabic indicator              |
| elapsed time                      | `stopwatch`                                  | `start/stop/toggle`, `MM:SS`                         |
| a countdown                       | `timer`                                      | emits `timer.timeout`; `timedOut`                    |
| choose a file/dir                 | `filepicker`                                 | injected/lazy `fs`; emits `filepicker.select`        |
| boxes, borders, colors, columns   | `style`                                      | not a component — a layout/styling helper            |
| click / scroll / drag input       | Program `{ mouse: true \| 'drag' \| 'all' }` | delivers `{type:'mouse'}` Msgs                       |

Compose freely: a "dashboard" is usually `list`/`table` + `viewport` joined with
`style.joinHorizontal`; a "form" is several `textinput`s + a `help` footer;
"submitting…" is a `spinner` driven by a worker/HTTP Cmd. See `examples/` —
there's a runnable example per component (`counter`, `form`, `list`, `table`,
`dashboard`, `pager`, `progress`, `paginator`, `mouse`, `textarea`, `timer`,
`filepicker`).

## Component cheat-sheet

All are created with `X.create(opts)`, return models (`update`/`view`, some
`init`), and mutate-and-return `this`. Components that own keys export a `keys`
keymap (feed it to `help`). Exact options are in each file's header comment.

- **spinner** `create({ frames, fps })` · `init()→Cmd` · presets `spinner.dots/line/points`
- **textinput** `create({ placeholder, prompt, charLimit, echoMode, value })` · `focus()/blur()/setValue()/reset()` · `.value`
- **textarea** `create({ width, height, placeholder, charLimit })` · `focus/blur/setValue/setSize` · `.value`, `.length`
- **viewport** `create({ width, height })` · `setContent()/scrollUp/Down/gotoTop/Bottom` · `atTop/atBottom/scrollPercent`
- **list** `create({ items, height, width, title, filterable })` · `selectedItem()/setItems()` · `.filtering`, `.visibleCount`, `list.keys`
- **table** `create({ columns, rows, height })` · `selectedRow()/setRows()/gotoTop/Bottom` · `.cursor`, `table.keys`
- **help** `create({ showAll, width, separator })` · `view(keymap)` — keymap = bindings array, array-of-columns, or an object of bindings
- **progress** `create({ width, gradient:[from,to], color, showPercentage })` · `view(percent)` · `setWidth()`
- **paginator** `create({ perPage, total, type })` · `sliceBounds()/nextPage/prevPage` · `.page`, `.totalPages`, `paginator.keys`
- **stopwatch** `create({ interval })` · `start/stop/toggle/reset` (→Cmd) · `.elapsed`, `.running`
- **timer** `create({ timeout, interval })` · `start/stop/toggle/reset` · `.timedOut`; emits `{type:'timer.timeout', id}`
- **filepicker** `create({ fs, path, cwd, height, showHidden })` · `init()→Cmd`, `selectedPath()`; emits `filepicker.select`

### Styling & layout (`style`)

```js
const { style } = require('./lib/tea')
style()
  .bold(true)
  .foreground('cyan')
  .padding(1, 2)
  .border(style.borders.rounded)
  .borderForeground('blue')
  .render(text)

style.joinHorizontal(style.position.top, leftBlock, '  ', rightBlock) // side by side
style.joinVertical(style.position.left, header, body, footer) // stacked
```

Colors accept names (`'red'`, `'brightblue'`), ANSI-256 (`205`), or hex
(`'#5A56E0'`). To pin a box to a width regardless of content, set `.width(n)` so
short/blank lines pad out (otherwise the box shrinks to the longest line).
Measurement helpers `style.width/height/truncate/stripAnsi` are ANSI- and
wide-char-aware — use them, never `.length`, when sizing styled text.

## When there's a gap: build a new component

Components are just models. Put new ones in `lib/tea/components/<name>.js`,
export from `lib/tea/index.js`, add a test in `test/<name>.js` (and `require` it
in `test/index.js`), and a runnable demo in `examples/<name>.js`. Conventions:

1. **Factory + class:** `function create(opts){ return new Thing(opts) }` and
   export `{ create, Thing }`. Add a header doc comment with a usage snippet.
2. **Model contract:** `update(msg) → [this, cmd]`, `view() → string`, optional
   `init() → cmd`. Mutate and return `this`.
3. **Ignore unrelated Msgs:** `if (!msg || msg.type !== 'key') return [this, null]`
   first, so a parent can broadcast freely. Input-like components gate on a
   `focused` flag (`focus()/blur()`), like `textinput`.
4. **Keymaps:** define a module-level `keys` object of `key.binding({ keys, help })`
   and match with `key.matches(msg, keys.x)`. Export `keys` so `help` can render
   it. Mirror existing key choices (↑/k, ↓/j, pgup/pgdn, home/end, / filter).
5. **Stay style-agnostic:** `view()` returns plain text plus at most minimal
   inline styling (reverse cursor, dim hint). Let the app add borders/colors via
   `style`. Always emit a stable rectangular block (pad to width/height) so it
   composes in layouts — see `viewport`/`table`/`list`.
6. **Async / animation via Cmds, never blocking:**
   - Timers/animation: re-issue a `tick`/`every` Cmd and carry a unique `id` +
     monotonic `tag` so strays/duplicates can't double-drive it (copy
     `spinner.js` / `timer.js`).
   - I/O (fs, network, workers): do it in a Cmd that resolves to a Msg. **Inject
     the dependency** (`opts.fs`, a client, …) and lazily `require()` the real
     one only inside `create()` when not provided — so importing the framework
     never pulls the dep in. Ship a mock. Copy `filepicker.js` exactly: it takes
     `{ fs, path }` or lazy-requires `bare-fs`/`bare-path`, and exports
     `filepicker.mock(tree)`.

Skeleton:

```js
const key = require('../key')
const { style } = require('../style')

const keys = { act: key.binding({ keys: ['enter'], help: { key: '↵', desc: 'do it' } }) }

class Widget {
  constructor(opts = {}) {
    this.value = opts.value || 0
  }
  update(msg) {
    if (!msg || msg.type !== 'key') return [this, null]
    if (key.matches(msg, keys.act)) this.value++
    return [this, null]
  }
  view() {
    return String(this.value)
  }
}

function create(opts) {
  return new Widget(opts)
}
module.exports = { create, Widget, keys }
```

## Testing TUIs (no terminal, no I/O)

The Program takes injectable streams, and components take injectable deps —
together they make whole UIs testable headlessly. Patterns (see `test/`):

- **Drive a Program:** pass `{ input, output, isTTY: true }` where `input` is a
  `bare-stream` `PassThrough` and `output` a capturing `Writable`; write key
  bytes to `input`, `await program.run()`, assert on captured output. Use
  `{ fps: 0 }` to render synchronously per update for deterministic frames.
- **Craft keys:** `new KeyMsg({ name, sequence, ctrl, meta, shift })`. A
  printable char uses `sequence: 'a'`; a named key uses `name: 'left'`.
- **Mock the filesystem:** `filepicker.mock(tree)` → `{ fs, path, root }`; pass
  to `filepicker.create`. No real disk access.
- **Unit-test components directly:** call `update(msg)` and assert on state /
  `view()`. Use `style.stripAnsi(view)` to assert on visible text.

Run tests with `npm test` (or `bare test/index.js`). Format with
`npx prettier --write` before finishing — the repo is prettier-clean.

```

```
