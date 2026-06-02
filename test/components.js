// Tests for the component layer (batch 1): spinner, textinput, and the
// composition contract (a child's Cmd threading through a parent + Program).
const { test } = require('brittle')
const { PassThrough, Writable } = require('bare-stream')
const { Program, quit, spinner, textinput, KeyMsg } = require('../lib/tea')

// Craft KeyMsgs the way the decoder would. `typed` is a printable character;
// `named` is a control key (sequence length > 1 so it's never inserted).
const typed = (ch) => new KeyMsg({ name: ch, sequence: ch, ctrl: false, meta: false, shift: false })
const named = (name) =>
  new KeyMsg({
    name,
    sequence: '\x1b[' + name,
    ctrl: false,
    meta: false,
    shift: false
  })

test('textinput: typing, cursor movement, and editing', (t) => {
  const input = textinput.create({ placeholder: 'name' })

  t.is(input.value, '', 'starts empty')
  input.update(typed('x'))
  t.is(input.value, '', 'ignores keys while blurred')

  input.focus()
  input.update(typed('h'))
  input.update(typed('i'))
  t.is(input.value, 'hi', 'typed characters inserted')
  t.is(input.cursor, 2, 'cursor follows insertion')

  input.update(named('left'))
  t.is(input.cursor, 1, 'left moves cursor back')
  input.update(typed('X'))
  t.is(input.value, 'hXi', 'insertion happens at the cursor')

  input.update(named('backspace'))
  t.is(input.value, 'hi', 'backspace removes char before cursor')
  t.is(input.cursor, 1, 'cursor moves back on backspace')

  input.update(named('delete'))
  t.is(input.value, 'h', 'delete removes char at cursor')

  input.update(named('home'))
  t.is(input.cursor, 0, 'home jumps to start')
  input.update(named('end'))
  t.is(input.cursor, 1, 'end jumps to end')
})

test('textinput: charLimit and password masking', (t) => {
  const input = textinput.create({ charLimit: 3, echoMode: 'password' }).focus()
  for (const c of 'abcd') input.update(typed(c))

  t.is(input.value, 'abc', 'charLimit caps the value')
  const view = input.view()
  t.absent(view.includes('abc'), 'view never reveals the raw value')
  t.ok(view.includes('•'), 'view shows mask characters')
})

test('spinner: ticks advance the frame; id/tag reject strays', (t) => {
  const s = spinner.create({ fps: 100 })

  t.is(s.frame, 0, 'starts on frame 0')
  t.is(typeof s.init(), 'function', 'init() returns a Cmd')

  const [, cmd] = s.update({ type: 'spinner.tick', id: s.id, tag: 0 })
  t.is(s.frame, 1, 'its own tick advances the frame')
  t.is(typeof cmd, 'function', 'and yields the next tick Cmd')

  s.update({ type: 'spinner.tick', id: s.id, tag: 0 }) // stale tag
  t.is(s.frame, 1, 'a stale tag is ignored (no double-drive)')

  s.update({ type: 'spinner.tick', id: s.id + 999, tag: 1 }) // another spinner
  t.is(s.frame, 1, "another spinner's tick is ignored")

  s.update({ type: 'spinner.tick', id: s.id, tag: 1 })
  t.is(s.frame, 2, 'the awaited tick advances again')

  t.not(spinner.create().id, s.id, 'each spinner gets a distinct id')
})

test('composition: a child Cmd threads through parent + Program', async (t) => {
  const input = new PassThrough()
  const output = new Writable({ write: (d, e, cb) => cb() })

  class Parent {
    constructor() {
      this.sp = spinner.create({ fps: 200 }) // ~5ms/frame
    }
    init() {
      return this.sp.init()
    }
    update(msg) {
      if (msg.type === 'spinner.tick') {
        const [s, cmd] = this.sp.update(msg)
        this.sp = s
        if (this.sp.frame >= 3) return [this, quit]
        return [this, cmd]
      }
      return [this, null]
    }
    view() {
      return this.sp.view()
    }
  }

  const parent = new Parent()
  await new Program(parent, { input, output, isTTY: true }).run()

  t.ok(parent.sp.frame >= 3, 'spinner advanced via Cmds routed by the parent')
})
