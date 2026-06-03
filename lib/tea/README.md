# bare-tea

A little TUI framework for [Bare](https://github.com/holepunchto/bare), based on
[The Elm Architecture](https://guide.elm-lang.org/architecture/). It's a
functional, stateful way to build terminal apps that's pleasant for both simple
and complex programs — and it runs anywhere Bare runs, with no Node.js
dependencies.

bare-tea is shaped after Charm's wonderful
[Bubble Tea](https://github.com/charmbracelet/bubbletea); if you know that, you
already know this. It ships its own component set (the
[Bubbles](https://github.com/charmbracelet/bubbles) equivalent) and a
styling/layout helper (the [Lip Gloss](https://github.com/charmbracelet/lipgloss)
equivalent), all built on Bare's native primitives (`bare-tty`,
`bare-ansi-escapes`).

> In this repository the framework lives at `./lib/tea` — examples import it as
> `require('../lib/tea')`. The snippets below use `require('bare-tea')`, the name
> it's published under.

## Tutorial

This tutorial assumes you have Bare installed — it comes with
[Pear](https://docs.pears.com). We'll build a simple counter.

bare-tea programs are made of a **model** describing the application state, and
three methods on that model:

- **`init`** — a function that returns an initial _command_ (or `null`).
- **`update`** — a function that handles incoming _messages_ and updates the
  model.
- **`view`** — a function that renders the model to a string.

### The Model

Start with a model — anything that holds your app's state. A class is idiomatic:

```js
const { Program, quit, key } = require('bare-tea')

class Counter {
  constructor() {
    this.count = 0
  }
}
```

### Initialization

`init` returns the first **command** to run, or `null` for none. Commands are
how you kick off work (timers, I/O); more on them below.

```js
init() {
  return null
}
```

### The Update Method

`update` is called when a **message** arrives. A message is any tagged value —
a keypress, a window resize, the result of a command. It returns a
`[model, command]` pair (returning a bare model means "no command").

```js
update(msg) {
  if (msg.type !== 'key') return [this, null]
  if (key.matches(msg, 'q', 'ctrl+c')) return [this, quit]   // quit the program
  if (key.matches(msg, 'up', 'k')) this.count++
  if (key.matches(msg, 'down', 'j')) this.count--
  return [this, null]
}
```

Mutating `this` and returning `[this, cmd]` is the idiomatic style here.

### The View Method

`view` renders the current model to a string. bare-tea draws it for you and only
repaints the lines that changed.

```js
view() {
  return `count: ${this.count}\n\n↑/↓ change · q quit`
}
```

### All Together Now

```js
const { Program, quit, key } = require('bare-tea')

class Counter {
  constructor() {
    this.count = 0
  }
  init() {
    return null
  }
  update(msg) {
    if (msg.type !== 'key') return [this, null]
    if (key.matches(msg, 'q', 'ctrl+c')) return [this, quit]
    if (key.matches(msg, 'up', 'k')) this.count++
    if (key.matches(msg, 'down', 'j')) this.count--
    return [this, null]
  }
  view() {
    return `count: ${this.count}\n\n↑/↓ change · q quit`
  }
}

new Program(new Counter()).run()
```

Run it with `bare counter.js`. The `Program` puts the terminal into raw mode,
enters the alternate screen, decodes input into messages, and — importantly —
restores the terminal on exit, even if your code throws.

## Commands

A **command** (`Cmd`) is a function `() => Msg | Promise<Msg> | null`. The
runtime runs it _off_ the update path and feeds whatever message it returns back
into `update`. This is how you do anything asynchronous — timers, file or network
I/O, talking to a worker — without blocking the UI.

```js
const { quit, batch, sequence, tick, every } = require('bare-tea')

quit // a Cmd that quits the program
tick(1000, () => ({ type: 'tick' })) // fire a Msg after 1s
every(1000, () => ({ type: 'tick' })) // fire on the wall-clock second
batch(cmdA, cmdB) // run several Cmds concurrently
sequence(cmdA, cmdB) // run several Cmds in order
```

An async command just returns a promise:

```js
const load = () =>
  fetch(url)
    .then((res) => res.json())
    .then((data) => ({ type: 'loaded', data }))
```

Return commands from `init` or `update`; the result comes back as a message.

## Key & mouse input

Keys arrive as `{ type: 'key' }` messages (a `KeyMsg`). Match them with
`key.matches`, which is null- and type-safe:

```js
if (key.matches(msg, 'enter')) ...
if (key.matches(msg, 'ctrl+c', 'q')) ...
```

Define reusable, self-documenting bindings with `key.binding` — the
[help](docs/help.md) component renders them automatically:

```js
const keys = {
  up: key.binding({ keys: ['up', 'k'], help: { key: '↑/k', desc: 'up' } })
}
```

Enable the mouse with a Program option; clicks/scroll/drag arrive as
`{ type: 'mouse', action, button, x, y }`:

```js
new Program(model, { mouse: true }) //  true | 'drag' | 'all'
```

## Components

Ready-made, composable pieces — each is a model (`update`/`view`) you embed in
your own. See each doc for options, methods, messages, and keybindings.

| Component                        | Description                             |
| -------------------------------- | --------------------------------------- |
| [spinner](docs/spinner.md)       | Animated loading indicator              |
| [textinput](docs/textinput.md)   | Single-line text field                  |
| [textarea](docs/textarea.md)     | Multi-line text editor                  |
| [list](docs/list.md)             | Selectable, filterable list             |
| [table](docs/table.md)           | Columns with selectable, scrolling rows |
| [viewport](docs/viewport.md)     | Scrollable window over long content     |
| [paginator](docs/paginator.md)   | Page state + indicator                  |
| [progress](docs/progress.md)     | Progress bar                            |
| [help](docs/help.md)             | Keybinding hints from `key.binding`s    |
| [stopwatch](docs/stopwatch.md)   | Counts elapsed time up                  |
| [timer](docs/timer.md)           | Counts a duration down                  |
| [filepicker](docs/filepicker.md) | Browse the filesystem and pick a file   |

To embed one, hold it as a field, route messages to it, and thread its command
back up:

```js
update(msg) {
  if (msg.type === 'spinner.tick') {
    const [s, cmd] = this.spinner.update(msg)
    this.spinner = s
    return [this, cmd]
  }
  ...
}
```

## Styling & layout

`style` is a small, chainable, immutable styling and layout helper (a Lip Gloss
equivalent). All measurement is ANSI- and wide-character-aware, so styled text
composes correctly.

```js
const { style } = require('bare-tea')

style()
  .bold(true)
  .foreground('cyan') // name, 0–255, or #hex
  .padding(1, 2)
  .border(style.borders.rounded)
  .borderForeground('blue')
  .render('Hello')

// Layout: place blocks side by side or stacked.
style.joinHorizontal(style.position.top, left, '  ', right)
style.joinVertical(style.position.left, header, body, footer)
```

Set `.width(n)` to pin a block to a fixed width (short/blank lines pad out, so a
bordered box tracks the screen edge instead of shrinking to its content).

## Testing

bare-tea is built to be tested headlessly — no real terminal, no real I/O.

- **Drive a Program** with injected streams: pass `{ input, output, isTTY: true }`
  (a `bare-stream` `PassThrough` and a capturing `Writable`), write key bytes to
  `input`, `await program.run()`, and assert on the captured output. Use
  `{ fps: 0 }` to render synchronously per update for deterministic frames.
- **Mock dependencies**: components that touch the outside world take their deps
  by injection. For example `filepicker.mock(tree)` returns an in-memory
  `{ fs, path }` so you can test a file browser with zero disk access.
- **Unit-test components** by calling `update(msg)` and asserting on state or
  `view()`. `style.stripAnsi(view)` gives you the visible text.

## Examples

Runnable, one per concept, in [`examples/`](../../examples):

`counter` · `form` · `list` · `table` · `dashboard` · `pager` · `progress` ·
`paginator` · `mouse` · `textarea` · `timer` · `filepicker`

```sh
bare examples/dashboard.js
```

## Building your own component

Components are just models, so you can build your own and they'll compose like
the built-ins. Keep to the conventions the built-ins follow — a `create()`
factory, `update → [model, cmd]` / `view → string`, ignore unrelated messages,
gate input on a `focused` flag, define keymaps with `key.binding`, stay
style-agnostic, and do animation/I/O through commands (with an injectable,
mockable dependency). The shipped components are short and meant to be read; copy
the closest one. The `tea-tui` skill in this repo walks through it in detail.

## Acknowledgments

Deeply indebted to [Charm](https://charm.sh) — bare-tea is a port of the ideas in
[Bubble Tea](https://github.com/charmbracelet/bubbletea),
[Bubbles](https://github.com/charmbracelet/bubbles), and
[Lip Gloss](https://github.com/charmbracelet/lipgloss) to the Bare runtime. Built
on [Bare](https://github.com/holepunchto/bare) by
[Holepunch](https://holepunch.to).

## License

Apache-2.0
