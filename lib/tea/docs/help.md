# help

Renders keybinding hints from `key.binding({ keys, help })` objects. It's a
_view helper_, not a loop model: `view(keymap)` is called from your own `view`.
Bindings without a `help` entry are skipped, so internal keys stay hidden.

[← all components](../README.md#components)

## Usage

```js
const { help, list } = require('bare-tea')

const h = help.create()

// short (one line) — pass any component's exported keymap:
h.view(list.keys)

// full (aligned columns) — toggle with '?', say:
h.showAll = true
h.view([[keys.up, keys.down], [keys.quit]])
```

A keymap can be:

- an **array** of bindings (short) or array-of-arrays (full columns),
- an **object** of bindings (its values are used), or
- an object exposing **`shortHelp()`** / **`fullHelp()`**.

## Options

| Option      | Default | Description                                        |
| ----------- | ------- | -------------------------------------------------- |
| `showAll`   | `false` | Full multi-column help vs the one-line short form  |
| `width`     | `0`     | Truncate the short line to this width (`0` = none) |
| `separator` | `' • '` | Between items in short mode                        |
| `styles`    | —       | `{ key, desc, sep }` functions to restyle parts    |

## API

- `view(keymap)` → the rendered hint string.
- `setWidth(n)`.

Every component that owns keys exports a `keys` keymap (`list.keys`,
`table.keys`, `viewport.keys`, `paginator.keys`) ready to pass straight in.
