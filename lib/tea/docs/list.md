# list

A selectable, filterable list. Owns selection and a scroll window that follows
the cursor; filtering is delegated to an embedded [textinput](textinput.md).

[← all components](../README.md#components)

## Usage

```js
const { list } = require('bare-tea')

const l = list.create({
  items: ['apple', 'banana', 'cherry'],
  height: 8,
  title: ' fruit'
})

// in update: const [m, cmd] = l.update(msg); this.list = m
// pick:      l.selectedItem()
```

Items can be strings or objects: `title` is shown, `filterValue` (falling back
to `title`) is matched.

## Options

| Option       | Default | Description                                 |
| ------------ | ------- | ------------------------------------------- |
| `items`      | `[]`    | Strings or `{ title, filterValue }` objects |
| `height`     | `10`    | Visible rows                                |
| `width`      | `0`     | Pad rows to this width (`0` = ragged)       |
| `title`      | `''`    | Optional heading line                       |
| `filterable` | `true`  | Allow `/` filtering                         |

## API

- `selectedItem()` — the underlying item under the cursor (or `null`).
- `setItems(items)`.
- `.filtering` — whether the filter input is active. `.visibleCount`,
  `.selected`, `.filter`.

## Keys

`↑`/`↓` (`k`/`j`) move, `pgup`/`pgdn` page, `/` enters filter mode (type to
narrow, `enter` keeps it, `esc` clears it). Bindings are exported as `list.keys`
for the [help](help.md) component.
