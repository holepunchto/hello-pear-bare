// tea — a tiny Elm Architecture runtime for Bare terminals.
//
// Built on Bare's native primitives (bare-tty for raw IO + window size,
// bare-ansi-escapes for key decoding and escape sequences), so it runs
// anywhere Bare runs and pulls in no Node-only dependencies. The API is shaped
// after Charm's Bubble Tea (Model/Cmd/Msg/Program) with the intent of growing
// into a drop-out framework.
//
//   const { Program, quit } = require('./lib/tea')
//
//   class App {
//     init() { return null }
//     update(msg) {
//       if (msg.type === 'key' && String(msg) === 'q') return [this, quit]
//       return [this, null]
//     }
//     view() { return 'press q to quit' }
//   }
//
//   new Program(new App()).run()
const Program = require('./program')
const commands = require('./commands')
const messages = require('./messages')
const key = require('./key')
const ansi = require('./ansi')
const { style } = require('./style')
const spinner = require('./components/spinner')
const textinput = require('./components/textinput')
const viewport = require('./components/viewport')
const list = require('./components/list')

module.exports = {
  Program,
  ...commands, // quit, batch, sequence, tick, every
  KeyMsg: messages.KeyMsg,
  key, // key.matches(msg, ...chords | bindings), key.binding({ keys, help })
  ansi,
  style, // style().bold().border(style.borders.rounded).render(...) + style.joinHorizontal/Vertical

  // Components — each a composable { init?, update, view } model.
  spinner, // spinner.create({ frames, fps })
  textinput, // textinput.create({ placeholder, prompt, charLimit, echoMode })
  viewport, // viewport.create({ width, height }) — scrollable window
  list // list.create({ items, height, width, title }) — selectable + filterable
}
