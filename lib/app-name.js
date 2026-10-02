const { productName, name } = require('../package.json')

const appName = productName || name
const binName = appName
  .replace(/[^a-z0-9]+/gi, '-')
  .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
  .toLowerCase()

module.exports = { appName, binName }
