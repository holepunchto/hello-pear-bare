# spinner

An animated loading indicator. Command-driven: it animates by re-issuing a tick
command each frame.

[← all components](../README.md#components)

## Usage

```js
const { spinner } = require('bare-tea')

class App {
  constructor() {
    this.spinner = spinner.create({ fps: 12 })
  }
  init() {
    return this.spinner.init() // start animating
  }
  update(msg) {
    if (msg.type === 'spinner.tick') {
      const [s, cmd] = this.spinner.update(msg)
      this.spinner = s
      return [this, cmd]
    }
    return [this, null]
  }
  view() {
    return `${this.spinner.view()} loading…`
  }
}
```

## Options

| Option   | Default        | Description                     |
| -------- | -------------- | ------------------------------- |
| `frames` | `spinner.dots` | Array of frame strings to cycle |
| `fps`    | `10`           | Frames per second               |

Frame presets: `spinner.dots`, `spinner.line`, `spinner.points`.

## API

- `init()` → a command that starts the animation. Call from your `init`.
- `update(msg)` → advances on its own `spinner.tick`, returns the next tick
  command.
- `view()` → the current frame string.

## Messages

Emits and consumes `{ type: 'spinner.tick', id, tag }`. The `id` + `tag` ensure a
second spinner's ticks (or a duplicate) can't double-drive this one — route every
`spinner.tick` to `update` and it sorts itself out.
