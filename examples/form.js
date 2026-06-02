// A composition demo: a parent model hosting two text inputs and a spinner.
//
//   bare examples/form.js
//
// It shows the component contract end to end — the spinner's tick Cmd flows up
// through the parent to the Program and back, keys route to whichever field has
// focus, and Tab/↑↓ move focus. Enter "submits"; Ctrl+C quits.
const { Program, quit, key, spinner, textinput } = require('../lib/tea')

class Form {
  constructor() {
    this.spinner = spinner.create({ fps: 12 })
    this.fields = [
      textinput.create({ placeholder: 'your name', prompt: '> ' }),
      textinput.create({ placeholder: 'you@example.com', prompt: '> ' })
    ]
    this.focus = 0
    this.fields[0].focus()
    this.submitted = false
  }

  init() {
    // Start the spinner. Its ticks come back as 'spinner.tick' Msgs below.
    return this.spinner.init()
  }

  update(msg) {
    if (msg.type === 'spinner.tick') {
      const [s, cmd] = this.spinner.update(msg)
      this.spinner = s
      return [this, cmd]
    }

    if (msg.type === 'key') {
      if (key.matches(msg, 'ctrl+c', 'esc')) return [this, quit]
      if (key.matches(msg, 'tab', 'down')) return [this._move(1), null]
      if (key.matches(msg, 'shift+tab', 'up')) return [this._move(-1), null]
      if (key.matches(msg, 'enter')) {
        this.submitted = true
        return [this, null]
      }
    }

    // Anything else goes to the focused field.
    const [field, cmd] = this.fields[this.focus].update(msg)
    this.fields[this.focus] = field
    return [this, cmd]
  }

  _move(dir) {
    this.fields[this.focus].blur()
    this.focus = (this.focus + dir + this.fields.length) % this.fields.length
    this.fields[this.focus].focus()
    this.submitted = false
    return this
  }

  view() {
    const [name, email] = this.fields
    const footer = this.submitted
      ? `  ✓ submitted: ${name.value} <${email.value}>`
      : '  tab/↑↓ switch · enter submit · ctrl+c quit'

    return [
      '',
      `  ${this.spinner.view()}  bare-tea form demo`,
      '',
      `  name   ${name.view()}`,
      `  email  ${email.view()}`,
      '',
      footer,
      ''
    ].join('\n')
  }
}

new Program(new Form()).run()
