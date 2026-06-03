// Program is the runtime — the event loop that drives one model.
//
// The Elm Architecture in three methods on a model:
//   init()        -> Cmd | null            run once at startup
//   update(msg)   -> [model, Cmd] | model  fold a Msg into new state
//   view()        -> string                render current state to text
//
// Program wires those to the terminal: it puts the input into raw mode, decodes
// keystrokes into KeyMsgs, turns SIGWINCH into resize Msgs, runs the
// update/render loop, executes Cmds off the update path, and — crucially —
// always restores the terminal on the way out.
//
// IO is injectable. By default it grabs the real TTY (fd 0/1); tests pass their
// own streams plus `isTTY: true` to exercise the full escape-sequence path
// without a terminal.
const tty = require('bare-tty')
const KeyDecoder = require('bare-ansi-escapes/key-decoder')
const Renderer = require('./renderer')
const { KeyMsg, windowSize } = require('./messages')

module.exports = class Program {
  constructor(model, opts = {}) {
    this.model = model
    this.opts = opts
    this.altScreen = opts.altScreen !== false

    // Frame coalescing: many Msgs arriving within one frame produce a single
    // render. fps <= 0 renders synchronously per update (handy in tests).
    this.fps = opts.fps == null ? 60 : opts.fps
    this._frameMs = this.fps > 0 ? Math.max(1, Math.round(1000 / this.fps)) : 0
    this._frameTimer = null
    this._needsRender = false

    // Only TTY fds can be put in raw mode / sized, and constructing a
    // tty.WriteStream on a non-TTY fd throws — so fall back to a no-op-ish
    // stream when there's no real terminal and nothing was injected.
    this._ownsInput = !opts.input
    this._ownsOutput = !opts.output
    this.input = opts.input || (tty.isTTY(0) ? new tty.ReadStream(0) : null)
    this.output = opts.output || (tty.isTTY(1) ? new tty.WriteStream(1) : null)

    // `isTTY` override lets headless tests drive the real rendering path.
    const detected = (s) => !!(s && s.isTTY)
    this.inputIsTTY = opts.isTTY ?? detected(this.input)
    this.outputIsTTY = opts.isTTY ?? detected(this.output)

    if (!this.output) {
      throw new Error('tea: no output stream (not a TTY); pass opts.output')
    }

    this.renderer = new Renderer(this.output, { altScreen: this.altScreen })

    // Single-consumer async message queue. send() wakes the loop.
    this._queue = []
    this._wake = null
    this._running = false
    this._tornDown = false

    this._decoder = null
    this._onInput = null
    this._onKey = null
    this._onResize = null
    this._signals = []
  }

  // Enqueue a Msg from anywhere — key decoder, resize handler, Cmd result, or
  // external code (e.g. a worker IPC bridge calling program.send(...)).
  send(msg) {
    if (!msg) return
    this._queue.push(msg)
    if (this._wake) {
      const wake = this._wake
      this._wake = null
      wake()
    }
  }

  quit() {
    this.send({ type: 'quit' })
  }

  async run() {
    this._running = true
    // try/finally guarantees the terminal is restored even if init/update/view
    // throws — otherwise a single bad model would leave the user in raw mode and
    // the alt-screen. The error still propagates after cleanup.
    try {
      this._setup()

      if (typeof this.model.init === 'function') this._exec(this.model.init())
      this.renderer.render(this._view()) // first frame before any input

      while (this._running) {
        const msg = await this._next()
        if (!msg) continue
        if (msg.type === 'quit') break
        if (msg.type === 'resize') this.renderer.clear() // geometry changed: repaint

        const [model, cmd] = this._update(msg)
        this.model = model
        this._invalidate() // coalesced render
        this._exec(cmd)
      }
    } finally {
      this._running = false
      this._cancelFrame()
      // Flush any pending coalesced frame so the final state is the last thing
      // drawn (matters for inline mode; harmless under the alt-screen).
      if (this._needsRender) {
        this._needsRender = false
        this.renderer.render(this._view())
      }
      this._teardown()
    }
    return this.model
  }

  // Mark the view dirty and schedule a render at most once per frame. Updates
  // that land in the same frame collapse into one write.
  _invalidate() {
    if (this._frameMs === 0) {
      this.renderer.render(this._view())
      return
    }
    this._needsRender = true
    if (this._frameTimer) return
    this._frameTimer = setTimeout(() => {
      this._frameTimer = null
      if (this._needsRender) {
        this._needsRender = false
        this.renderer.render(this._view())
      }
    }, this._frameMs)
  }

  _cancelFrame() {
    if (this._frameTimer) {
      clearTimeout(this._frameTimer)
      this._frameTimer = null
    }
  }

  _setup() {
    if (this.input) {
      if (this.inputIsTTY && this.input.setRawMode) this.input.setRawMode(true)
      this._decoder = new KeyDecoder()
      // Forward bytes manually instead of input.pipe(decoder): streamx has no
      // unpipe, and a piped source destroyed mid-stream (which is exactly what
      // teardown does) destroys the destination with a synthetic "closed before
      // ending" error. Manual forwarding has no Pipeline, so teardown is clean.
      this._onKey = (key) => this.send(new KeyMsg(key))
      this._onInput = (data) => this._decoder.write(data)
      this._decoder.on('data', this._onKey)
      this.input.on('data', this._onInput)
    }

    if (this.outputIsTTY && typeof this.output.on === 'function') {
      this._onResize = () => this.send(windowSize(this.output.columns, this.output.rows))
      this.output.on('resize', this._onResize)
    }

    this.renderer.start()

    // Seed the model with the initial geometry. Real TTYs report columns/rows;
    // injected streams won't, so fall back to opts then a sane default.
    const width = this.output.columns ?? this.opts.width ?? 80
    const height = this.output.rows ?? this.opts.height ?? 24
    this.send(windowSize(width, height))

    // In raw mode the kernel won't deliver Ctrl+C as SIGINT (the app sees it as
    // a key), but a kill/hangup from outside still must restore the terminal.
    for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
      const handler = () => this.send({ type: 'quit' })
      try {
        global.Bare.on(sig, handler)
        this._signals.push([sig, handler])
      } catch {}
    }
  }

  _teardown() {
    if (this._tornDown) return
    this._tornDown = true

    // No frame may fire after the screen is restored, or it writes onto the
    // user's normal buffer.
    this._cancelFrame()

    for (const [sig, handler] of this._signals) {
      try {
        global.Bare.removeListener(sig, handler)
      } catch {}
    }
    try {
      if (this._onResize) this.output.removeListener('resize', this._onResize)
    } catch {}
    // Detach the manual forwarders before tearing anything down so neither
    // stream sees data after it's gone.
    try {
      if (this.input && this._onInput) {
        this.input.removeListener('data', this._onInput)
      }
    } catch {}
    try {
      if (this._decoder && this._onKey) {
        this._decoder.removeListener('data', this._onKey)
      }
    } catch {}
    try {
      this._decoder?.destroy()
    } catch {}
    try {
      if (this.input && this.inputIsTTY && this.input.setRawMode) {
        this.input.setRawMode(false)
      }
    } catch {}

    this.renderer.stop() // show cursor, leave alt screen

    // We own the input fd, so close it; leave output open in case the host CLI
    // keeps writing after the TUI exits.
    if (this._ownsInput && this.input) {
      try {
        this.input.destroy()
      } catch {}
    }
  }

  // Normalise update()'s return into a [model, cmd] pair. Accepts a bare model
  // (no cmd) or null (no change), so update() can be terse.
  _update(msg) {
    const ret = this.model.update(msg)
    if (ret == null) return [this.model, null]
    if (Array.isArray(ret)) return [ret[0] ?? this.model, ret[1] ?? null]
    return [ret, null]
  }

  _view() {
    try {
      return String(this.model.view())
    } catch (err) {
      return 'view error: ' + (err && err.message)
    }
  }

  // Kick off a Cmd off the update path. Fire-and-forget at the top level —
  // _runCmd dispatches each resulting Msg as it resolves.
  _exec(cmd) {
    this._runCmd(cmd)
  }

  // Recursively run a Cmd to completion. One function handles every shape so
  // they nest correctly:
  //   null/undefined  -> nothing
  //   array (batch)   -> run all concurrently, resolve when the last finishes
  //   { __seq } (seq) -> run in order, awaiting each (and its nested cmds)
  //   function (Cmd)  -> call it, send the Msg it returns
  // Bails if the program is quitting so a sequence can't outlive teardown.
  async _runCmd(cmd) {
    if (!cmd || !this._running) return

    if (Array.isArray(cmd)) {
      await Promise.all(cmd.map((c) => this._runCmd(c)))
      return
    }

    if (cmd.__seq) {
      for (const c of cmd.__seq) {
        if (!this._running) return
        await this._runCmd(c)
      }
      return
    }

    try {
      this.send(await cmd())
    } catch (error) {
      this.send({ type: 'error', error })
    }
  }

  // Await the next Msg. The executor body runs synchronously, so _wake is set
  // before we suspend — no lost-wakeup race with send().
  async _next() {
    if (this._queue.length === 0) {
      await new Promise((resolve) => {
        this._wake = resolve
      })
    }
    return this._queue.shift()
  }
}
