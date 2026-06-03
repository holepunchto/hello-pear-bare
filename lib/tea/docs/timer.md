# timer

Counts a duration down to zero. Command-driven like the
[stopwatch](stopwatch.md); when it reaches zero it stops and emits a one-shot
timeout message.

[← all components](../README.md#components)

## Usage

```js
const { timer } = require('bare-tea')

class App {
  constructor() {
    this.timer = timer.create({ timeout: 10000 }) // 10s
  }
  init() {
    return this.timer.start()
  }
  update(msg) {
    if (msg.type === 'timer.timeout') {
      /* done */ return [this, null]
    }
    if (msg.type === 'timer.tick') {
      const [t, cmd] = this.timer.update(msg)
      this.timer = t
      return [this, cmd]
    }
    return [this, null]
  }
  view() {
    return this.timer.view() // "00:09"
  }
}
```

## Options

| Option     | Default | Description                      |
| ---------- | ------- | -------------------------------- |
| `timeout`  | `0`     | Initial duration in milliseconds |
| `interval` | `1000`  | Milliseconds per tick            |

## API

- `start()` / `stop()` / `toggle()` — return a command (or `null`). Won't start
  from zero.
- `reset()` — restore the initial duration.
- `.timeout` (ms remaining) / `.running` / `.timedOut`.
- `view()` → `MM:SS`.

## Messages

Consumes `{ type: 'timer.tick', id, tag }`; on reaching zero its `update` returns
a command that emits `{ type: 'timer.timeout', id }` — handle that to react to
the timeout.
