// Headless lifecycle test for the tea runtime.
//
// There's no real terminal in CI, so we inject in-memory streams and pass
// `isTTY: true` to force the full escape-sequence path. We then write raw key
// bytes into the input and assert on what the renderer emitted — proving the
// whole loop: setup -> init -> render -> key/update -> render -> quit ->
// restore.
const { test } = require('brittle')
const { PassThrough, Writable } = require('bare-stream')
const { Program, quit } = require('../lib/tea')

function captureStream() {
  const chunks = []
  const stream = new Writable({
    write(data, enc, cb) {
      chunks.push(Buffer.from(data))
      cb()
    }
  })
  stream.text = () => Buffer.concat(chunks).toString('utf8')
  return stream
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 15))

test('tea lifecycle: setup, key updates, quit, restore', async (t) => {
  const input = new PassThrough()
  const output = captureStream()

  class Model {
    constructor() {
      this.n = 0
      this.width = 0
    }
    init() {
      return null
    }
    update(msg) {
      if (msg.type === 'resize') this.width = msg.width
      if (msg.type === 'key') {
        if (String(msg) === 'q') return [this, quit]
        if (msg.name === 'up') this.n++
      }
      return [this, null]
    }
    view() {
      return `n=${this.n} w=${this.width}`
    }
  }

  const program = new Program(new Model(), {
    input,
    output,
    isTTY: true,
    width: 80,
    height: 24
  })
  const done = program.run()

  input.write(Buffer.from('\x1b[A')) // up
  await settle()
  input.write(Buffer.from('\x1b[A')) // up
  await settle()
  input.write(Buffer.from('q')) // quit
  const model = await done

  const out = output.text()

  t.is(model.n, 2, 'two up-presses folded into state')
  t.is(model.width, 80, 'initial window size delivered to model')
  t.ok(out.includes('\x1b[?1049h'), 'entered alternate screen on start')
  t.ok(out.includes('n=2'), 'final state rendered')
  t.ok(out.includes('\x1b[?25h'), 'cursor shown again on teardown')
  t.ok(out.includes('\x1b[?1049l'), 'left alternate screen on teardown')
})

test('tea: ctrl+c surfaces as a key (app decides to quit)', async (t) => {
  const input = new PassThrough()
  const output = captureStream()
  let sawCtrlC = false

  class Model {
    init() {
      return null
    }
    update(msg) {
      if (msg.type === 'key' && String(msg) === 'ctrl+c') {
        sawCtrlC = true
        return [this, quit]
      }
      return [this, null]
    }
    view() {
      return 'waiting'
    }
  }

  const program = new Program(new Model(), { input, output, isTTY: true })
  const done = program.run()

  input.write(Buffer.from('\x03')) // ctrl+c
  await done

  t.ok(sawCtrlC, 'ctrl+c delivered to update as a key chord')
})

test('tea: teardown does not cascade a stream error', async (t) => {
  // Regression: the input used to be input.pipe(decoder). streamx has no
  // unpipe, so destroying one end on teardown destroyed the other with a
  // synthetic "closed before/prematurely" error. We forward bytes manually now.
  const input = new PassThrough()
  const output = captureStream()
  let streamError = null
  input.on('error', (err) => {
    streamError = err
  })

  class Model {
    update(msg) {
      if (msg.type === 'key' && String(msg) === 'q') return [this, quit]
      return [this, null]
    }
    view() {
      return 'x'
    }
  }

  const program = new Program(new Model(), { input, output, isTTY: true })
  const done = program.run()
  input.write(Buffer.from('q'))
  await done
  await settle()

  // Simulate the owned-input teardown of a real TTY: closing input must not
  // reach back into the decoder the program already detached.
  input.destroy()
  await settle()

  t.is(streamError, null, 'no premature-close error during/after teardown')
})

test('tea: restores the terminal even when update throws', async (t) => {
  const input = new PassThrough()
  const output = captureStream()

  class Boom {
    update(msg) {
      if (msg.type === 'key') throw new Error('boom')
      return [this, null]
    }
    view() {
      return 'x'
    }
  }

  const program = new Program(new Boom(), { input, output, isTTY: true })
  const done = program.run()
  input.write(Buffer.from('x')) // triggers the throw

  let error = null
  try {
    await done
  } catch (err) {
    error = err
  }

  const out = output.text()
  t.ok(error && /boom/.test(error.message), 'run() rejects with the error')
  t.ok(out.includes('\x1b[?25h'), 'cursor shown again despite the throw')
  t.ok(out.includes('\x1b[?1049l'), 'left alternate screen despite the throw')
})

test('tea: renders coalesce — many Msgs collapse into few frames', async (t) => {
  const input = new PassThrough()
  const output = captureStream()

  class Counter {
    constructor() {
      this.n = 0
    }
    update(msg) {
      if (msg.type === 'bump') this.n++
      if (msg.type === 'key') return [this, quit]
      return [this, null]
    }
    view() {
      return 'n=' + this.n
    }
  }

  const program = new Program(new Counter(), { input, output, isTTY: true, fps: 60 })

  // Spy on the renderer to count actual writes.
  let renders = 0
  const realRender = program.renderer.render.bind(program.renderer)
  program.renderer.render = (view) => {
    renders++
    return realRender(view)
  }

  const done = program.run()
  // A burst within a single frame: these should collapse to one flush.
  for (let i = 0; i < 20; i++) program.send({ type: 'bump' })
  program.send({ type: 'quit' })
  await done

  t.ok(renders <= 3, `20 updates coalesced into ${renders} frames`)
  t.ok(output.text().includes('n=20'), 'final state still rendered')
})
