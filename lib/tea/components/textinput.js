// textinput — a single-line editable field.
//
// This is the reference for an *input-driven* component: no Cmds, just state
// folded from key Msgs. It only reacts when focused, so a parent can host
// several and route keys to whichever has focus:
//
//   class Form {
//     constructor () {
//       this.name = textinput.create({ placeholder: 'name' }).focus()
//     }
//     update (msg) {
//       const [f, cmd] = this.name.update(msg)
//       this.name = f
//       return [this, cmd]
//     }
//     view () { return this.name.view() }
//   }
//
// Because the Program hides the real terminal cursor, the field draws its own
// as a reverse-video cell.
const ansi = require('../ansi')

const dim = (s) => ansi.modifierDim + s + ansi.modifierReset
const reverse = (s) => ansi.modifierReverse + s + ansi.modifierNotReverse

class TextInput {
  constructor(opts = {}) {
    this.value = opts.value || ''
    this.placeholder = opts.placeholder || ''
    this.prompt = opts.prompt || ''
    this.charLimit = opts.charLimit || 0 // 0 = unlimited
    this.echoMode = opts.echoMode || 'normal' // 'normal' | 'password'
    this.maskChar = opts.maskChar || '•'
    this.focused = !!opts.focused
    this.cursor = this.value.length // insertion point, 0..value.length
  }

  focus() {
    this.focused = true
    return this
  }

  blur() {
    this.focused = false
    return this
  }

  setValue(v) {
    v = String(v)
    this.value = this.charLimit ? v.slice(0, this.charLimit) : v
    this.cursor = Math.min(this.cursor, this.value.length)
    return this
  }

  reset() {
    this.value = ''
    this.cursor = 0
    return this
  }

  update(msg) {
    // Only a focused field consumes keys; everything else is a no-op so the
    // parent can broadcast Msgs freely.
    if (!this.focused || !msg || msg.type !== 'key') return [this, null]

    if (msg.is('left', 'ctrl+b')) {
      this.cursor = Math.max(0, this.cursor - 1)
    } else if (msg.is('right', 'ctrl+f')) {
      this.cursor = Math.min(this.value.length, this.cursor + 1)
    } else if (msg.is('home', 'ctrl+a')) {
      this.cursor = 0
    } else if (msg.is('end', 'ctrl+e')) {
      this.cursor = this.value.length
    } else if (msg.is('backspace')) {
      if (this.cursor > 0) {
        this.value = this.value.slice(0, this.cursor - 1) + this.value.slice(this.cursor)
        this.cursor--
      }
    } else if (msg.is('delete')) {
      if (this.cursor < this.value.length) {
        this.value = this.value.slice(0, this.cursor) + this.value.slice(this.cursor + 1)
      }
    } else {
      this._insert(msg)
    }

    return [this, null]
  }

  // Insert a single printable character at the cursor. We key off the decoded
  // sequence (not name) so case and punctuation come through verbatim, and skip
  // control bytes, chorded keys, and DEL.
  _insert(msg) {
    const ch = msg.sequence
    const printable =
      !msg.ctrl &&
      !msg.meta &&
      typeof ch === 'string' &&
      ch.length === 1 &&
      ch >= ' ' &&
      ch !== '\x7f'
    if (!printable) return
    if (this.charLimit && this.value.length >= this.charLimit) return

    this.value = this.value.slice(0, this.cursor) + ch + this.value.slice(this.cursor)
    this.cursor++
  }

  _display() {
    if (this.echoMode === 'password') return this.maskChar.repeat(this.value.length)
    return this.value
  }

  view() {
    // Empty: dim placeholder, with the cursor over its first cell when focused.
    if (this.value.length === 0) {
      if (!this.focused) return this.prompt + dim(this.placeholder)
      const head = this.placeholder.slice(0, 1) || ' '
      return this.prompt + reverse(head) + dim(this.placeholder.slice(1))
    }

    const text = this._display()
    if (!this.focused) return this.prompt + text

    // Draw the cursor as a reverse cell; a trailing space when at end-of-line.
    const at = text.slice(this.cursor, this.cursor + 1) || ' '
    return this.prompt + text.slice(0, this.cursor) + reverse(at) + text.slice(this.cursor + 1)
  }
}

function create(opts) {
  return new TextInput(opts)
}

module.exports = { create, TextInput }
