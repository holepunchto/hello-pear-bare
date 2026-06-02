// spinner — a Cmd-driven animated spinner.
//
// This is the reference for a *command-driven* component. It animates by
// re-issuing a tick Cmd each frame; the parent model just routes 'spinner.tick'
// Msgs into update() and threads the returned Cmd up to the Program:
//
//   class App {
//     constructor () { this.spinner = spinner.create() }
//     init () { return this.spinner.init() }
//     update (msg) {
//       const [s, cmd] = this.spinner.update(msg)
//       this.spinner = s
//       return [this, cmd]
//     }
//     view () { return this.spinner.view() + ' loading…' }
//   }
//
// Each spinner has a unique id and a monotonic tag so that strays — a second
// spinner's ticks, or a duplicated/late tick — can't double-drive the loop.
const { tick } = require('../commands')

// A few frame sets. `dots` is the default.
const dots = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const line = ['|', '/', '-', '\\']
const points = ['∙∙∙', '●∙∙', '∙●∙', '∙∙●']

let nextId = 1

class Spinner {
  constructor(opts = {}) {
    this.frames = opts.frames || dots
    this.fps = opts.fps || 10
    this.frame = 0
    this.id = nextId++ // distinguishes this spinner's ticks from any other's
    this.tag = 0 // bumped each accepted tick; stale ticks are ignored
  }

  // Returns the Cmd that starts the animation. Call from the parent's init().
  init() {
    return this._tick()
  }

  _tick() {
    const id = this.id
    const tag = this.tag
    const ms = Math.max(1, Math.round(1000 / this.fps))
    return tick(ms, () => ({ type: 'spinner.tick', id, tag }))
  }

  update(msg) {
    if (!msg || msg.type !== 'spinner.tick') return [this, null]
    // Ignore another spinner's ticks and any tick that isn't the one we're
    // currently waiting on (duplicates, late fires).
    if (msg.id !== this.id || msg.tag !== this.tag) return [this, null]

    this.frame = (this.frame + 1) % this.frames.length
    this.tag++
    return [this, this._tick()]
  }

  view() {
    return this.frames[this.frame]
  }
}

function create(opts) {
  return new Spinner(opts)
}

module.exports = { create, Spinner, dots, line, points }
