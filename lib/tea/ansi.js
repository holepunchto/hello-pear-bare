// ANSI helpers for the tea runtime.
//
// We build on `bare-ansi-escapes` (cursor/erase/color + the KeyDecoder) and add
// the few sequences it doesn't ship: alternate screen, absolute cursor
// addressing and mouse tracking. Keeping them here means the renderer and
// program never hand-roll escape codes.
const ansi = require('bare-ansi-escapes')
const {
  constants: { CSI, SGR }
} = ansi

module.exports = {
  ...ansi,

  // Absolute cursor move (0-indexed row/col). bare-ansi-escapes' cursorPosition
  // has a column-first signature and treats row 0 as "stay", which is awkward
  // for a renderer that thinks in (row, col), so we expose our own.
  cursorTo: (row = 0, col = 0) => CSI + (row + 1) + ';' + (col + 1) + 'H',
  home: CSI + 'H',

  // Reverse video — used to draw a cursor cell when the real terminal cursor is
  // hidden (e.g. inside a text input).
  modifierReverse: SGR(7),
  modifierNotReverse: SGR(27),

  // Alternate screen buffer — gives the app its own full screen and restores
  // the user's scrollback untouched on exit.
  enterAltScreen: CSI + '?1049h',
  leaveAltScreen: CSI + '?1049l',

  // SGR mouse tracking (button events + SGR extended coordinates).
  enableMouse: CSI + '?1000h' + CSI + '?1006h',
  disableMouse: CSI + '?1006l' + CSI + '?1000l'
}
