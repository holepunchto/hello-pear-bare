const { test } = require('brittle')

require('./tea')
require('./commands')
require('./components')
require('./viewport')
require('./list')
require('./style')

test('works', (t) => {
  t.pass()
})
