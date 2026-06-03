# progress

A percentage bar. Static like [help](help.md): it holds the look and
`view(percent)` renders a bar at the given fraction. Drive the percent from your
model (a tick, a download callback, the OTA updater).

[← all components](../README.md#components)

## Usage

```js
const { progress } = require('bare-tea')

const bar = progress.create({ width: 40, gradient: ['#5A56E0', '#EE6FF8'] })

// in view:
bar.view(0.42) // "████████████░░░░…  42%"
```

## Options

| Option           | Default | Description                                     |
| ---------------- | ------- | ----------------------------------------------- |
| `width`          | `40`    | Total width including the percentage label      |
| `full`           | `'█'`   | Filled cell character                           |
| `empty`          | `'░'`   | Empty cell character                            |
| `showPercentage` | `true`  | Append a ` NNN%` label (reserves 5 cells)       |
| `color`          | `null`  | Solid fill color (name, 0–255, or `#hex`)       |
| `gradient`       | `null`  | `[fromHex, toHex]` interpolated across the fill |

## API

- `view(percent)` → bar string. `percent` is `0..1` and is clamped.
- `setWidth(n)` — e.g. on a resize message.

The label slot is a fixed width, so the bar doesn't jump as the number changes.
