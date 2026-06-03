# textinput

A single-line editable text field. Input-driven: no commands, just state folded
from key messages. Only consumes keys while focused, so a parent can host several
and route to whichever has focus.

[← all components](../README.md#components)

## Usage

```js
const { textinput } = require('bare-tea')

class Form {
  constructor() {
    this.name = textinput.create({ placeholder: 'name', prompt: '> ' }).focus()
  }
  update(msg) {
    const [f, cmd] = this.name.update(msg)
    this.name = f
    return [this, cmd]
  }
  view() {
    return this.name.view()
  }
}
```

## Options

| Option        | Default    | Description                                 |
| ------------- | ---------- | ------------------------------------------- |
| `value`       | `''`       | Initial text                                |
| `placeholder` | `''`       | Dim text shown when empty                   |
| `prompt`      | `''`       | Prefix drawn before the value (e.g. `'> '`) |
| `charLimit`   | `0`        | Max length (`0` = unlimited)                |
| `echoMode`    | `'normal'` | `'password'` masks the value                |
| `maskChar`    | `'•'`      | Mask character in password mode             |
| `focused`     | `false`    | Start focused                               |

## API

- `focus()` / `blur()` — toggle whether keys are consumed.
- `setValue(v)` / `reset()` — set or clear the text.
- `.value` — the current string.

## Keys

`←`/`→` move, `home`/`end` (and `ctrl+a`/`ctrl+e`) jump, `backspace`/`delete`
edit, printable characters insert at the cursor. The field draws its own
reverse-video cursor (the Program hides the real one).
