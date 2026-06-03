# textarea

A multi-line text editor. Soft-wraps to its width, scrolls a fixed-height
window, and moves the cursor by _visual_ row (so up/down feel right inside
wrapped text). Input-driven and focus-gated, like [textinput](textinput.md).

[← all components](../README.md#components)

## Usage

```js
const { textarea } = require('bare-tea')

const ta = textarea.create({ width: 60, height: 10, placeholder: 'Type…' }).focus()

// in update: const [t, cmd] = ta.update(msg); this.ta = t
// in view:   this.ta.view()
```

## Options

| Option        | Default | Description                                     |
| ------------- | ------- | ----------------------------------------------- |
| `value`       | `''`    | Initial contents                                |
| `width`       | `40`    | Wrap width / render width                       |
| `height`      | `6`     | Visible rows                                    |
| `placeholder` | `''`    | Dim text shown when empty                       |
| `charLimit`   | `0`     | Max characters incl. newlines (`0` = unlimited) |
| `focused`     | `false` | Start focused                                   |

## API

- `focus()` / `blur()`.
- `setValue(v)` / `reset()`.
- `setSize(width, height)` — e.g. on a resize message.
- `.value` — the text (lines joined by `\n`). `.length` — character count.

## Keys

`←`/`→` move by character (wrapping across lines), `↑`/`↓` by visual row,
`home`/`end` to the visual row's edges, `enter` splits the line, `backspace`/
`delete` edit and merge lines, printable characters insert. Renders a
rectangular `width × height` block, so it drops straight into a `style` box.
