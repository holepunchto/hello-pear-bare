const pkg = require('./package.json')

module.exports = {
  name: pkg.productName || pkg.name,
  out: './out',
  standalone: true
}
