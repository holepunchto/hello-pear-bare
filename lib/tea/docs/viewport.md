# viewport

A scrollable window over content taller than the available space. Renders a
fixed `height`-row window and always emits exactly that many lines (padding short
content), so surrounding layout stays stable.

[← all components](../README.md#components)

## Usage

```js
const { viewport } = require('bare-tea')

const vp = viewport.create({ width: 40, height: 10 })
vp.setContent(longText)

// in update: const [v] = vp.update(msg); this.vp = v
// in view:   this.vp.view()
```

## Options

| Option   | Default | Description                                        |
| -------- | ------- | -------------------------------------------------- |
| `width`  | `0`     | Truncate lines to this width (`0` = no truncation) |
| `height` | `0`     | Visible rows                                       |

## API

- `setContent(string)` — set the scrollable text.
- `scrollUp(n)` / `scrollDown(n)` / `gotoTop()` / `gotoBottom()` /
  `setYOffset(n)`.
- `.atTop` / `.atBottom` / `.scrollPercent` / `.maxOffset` / `.yOffset`.

## Keys

`↑`/`↓` (`k`/`j`) by line, `pgup`/`pgdn` (`b`/`f`) by page, `ctrl+u`/`ctrl+d`
half-page, `home`/`end` to the ends. Bindings are exported as `viewport.keys`
for the [help](help.md) component.
