# table

Fixed-width columns with selectable, scrolling rows. Cells are truncated/padded
to their column width (ANSI-aware), the selection is a reverse-video bar, and the
body scrolls in a fixed-height window.

[← all components](../README.md#components)

## Usage

```js
const { table } = require('bare-tea')

const t = table.create({
  columns: [
    { title: 'Package', width: 18 },
    { title: 'Lang', width: 5 }
  ],
  rows: [
    ['corestore', 'js'],
    ['hypercore', 'js']
  ],
  height: 8
})

// in update: const [m] = t.update(msg); this.table = m
// selected:  t.selectedRow()
```

## Options

| Option    | Default | Description                           |
| --------- | ------- | ------------------------------------- |
| `columns` | `[]`    | `{ title, width }` per column         |
| `rows`    | `[]`    | Arrays of cell values, one per column |
| `height`  | `10`    | Visible body rows                     |
| `rule`    | `'─'`   | Character for the header underline    |

## API

- `selectedRow()` — the row array under the cursor (or `null`).
- `setRows(rows)` / `setColumns(columns)`.
- `gotoTop()` / `gotoBottom()`.
- `.cursor` / `.offset` / `.totalWidth`.

Renders a stable `2 + height`-row block (header, rule, body), so it sits cleanly
inside a `style` box.

## Keys

`↑`/`↓` (`k`/`j`) move, `pgup`/`pgdn` page, `home`/`end` jump. Bindings are
exported as `table.keys` for the [help](help.md) component.
