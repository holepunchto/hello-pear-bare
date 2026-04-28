const os = require('bare-os')
const path = require('bare-path')
const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const PearRuntime = require('pear-runtime')

const pkg = require('../package.json')

function getRunningAppPath() {
  if (global.Bare && Array.isArray(Bare.argv) && typeof Bare.argv[0] === 'string') {
    return path.resolve(Bare.argv[0])
  }

  if (typeof process !== 'undefined' && process.execPath) return process.execPath

  return null
}

function createPearRuntime({ storage, updates }) {
  const appName = pkg.productName || pkg.name
  const dir = storage || path.join(os.tmpdir(), 'pear', appName)

  const store = new Corestore(path.join(dir, 'pear-runtime/corestore'))
  const swarm = new Hyperswarm()

  const pear = new PearRuntime({
    dir,
    app: getRunningAppPath(),
    updates,
    version: pkg.version,
    upgrade: pkg.upgrade,
    name: appName,
    store,
    swarm
  })

  if (updates !== false) {
    pear.updater.on('updating', () => console.log('[updater] getting new update'))

    pear.updater.on('updating-delta', (d) => console.log('[updater]', d))
    
    pear.updater.on('updated', async () => {
      console.log('[updater] update complete... appling')
      await pear.updater.applyUpdate()
      console.log('[updater] applied update, restart to run latest version')
    })
    
    swarm.on('connection', (connection) => store.replicate(connection))
    swarm.join(pear.updater.drive.core.discoveryKey, {
      client: true,
      server: false
    })    
  }

  pear.on('error', (err) => {
    console.error('[pear-runtime:error]', err)
  })

  return pear
}

module.exports = { createPearRuntime }
