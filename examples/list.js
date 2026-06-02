// A picker built on the list component.
//
//   bare examples/list.js
//
// ↑/↓ or j/k to move, / to filter (type to narrow, esc to clear), enter to
// choose, q to quit. While filtering, keys edit the query — so q quits only
// when you're not filtering; ctrl+c always quits.
const { Program, quit, key, list } = require('../lib/tea')

const fruits = [
  'apple',
  'apricot',
  'banana',
  'blueberry',
  'cherry',
  'date',
  'elderberry',
  'fig',
  'grape',
  'kiwi',
  'lemon',
  'mango',
  'nectarine',
  'orange',
  'peach',
  'pear',
  'plum',
  'raspberry',
  'strawberry',
  'watermelon'
]

class Picker {
  constructor() {
    this.list = list.create({
      items: fruits,
      height: 8,
      width: 30,
      title: ' pick a fruit'
    })
    this.chosen = null
  }

  update(msg) {
    if (msg.type === 'key') {
      if (key.matches(msg, 'ctrl+c')) return [this, quit]
      if (!this.list.filtering && key.matches(msg, 'q')) return [this, quit]
      if (!this.list.filtering && key.matches(msg, 'enter')) {
        this.chosen = this.list.selectedItem()
        return [this, null]
      }
    }

    const [l, cmd] = this.list.update(msg)
    this.list = l
    return [this, cmd]
  }

  view() {
    return [
      '',
      this.list.view(),
      '',
      this.chosen ? `  ✓ chosen: ${this.chosen}` : '  / filter · enter choose · q quit',
      ''
    ].join('\n')
  }
}

new Program(new Picker()).run()
