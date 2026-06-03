# stopwatch

Counts elapsed time upward. Command-driven like the [spinner](spinner.md):
`start()` returns a tick command, and each accepted tick advances `elapsed` and
re-issues the next.

[← all components](../README.md#components)

## Usage

```js
const { stopwatch } = require('bare-tea')

class App {
  constructor() {
    this.sw = stopwatch.create()
  }
  init() {
    return this.sw.start()
  }
  update(msg) {
    if (msg.type === 'stopwatch.tick') {
      const [sw, cmd] = this.sw.update(msg)
      this.sw = sw
      return [this, cmd]
    }
    return [this, null]
  }
  view() {
    return this.sw.view() // "01:23"
  }
}
```

## Options

| Option     | Default | Description                  |
| ---------- | ------- | ---------------------------- |
| `interval` | `1000`  | Milliseconds per tick        |
| `elapsed`  | `0`     | Initial elapsed milliseconds |

## API

- `start()` / `stop()` / `toggle()` — return a command (or `null`); thread it up.
- `reset()` — zero `elapsed`; a running stopwatch keeps ticking.
- `.elapsed` (ms) / `.running`.
- `view()` → `MM:SS` (or `H:MM:SS`).

## Messages

Emits and consumes `{ type: 'stopwatch.tick', id, tag }`; id + tag guard against
strays, so pause/resume can't double-drive it.
