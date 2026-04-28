const { command, flag } = require('paparam')
const storageAPI = require('bare-storage')
const pkg = require('./package.json')
const os = require('bare-os')
const path = require('bare-path')
const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const PearRuntime = require('pear-runtime')

const appName = pkg.productName || pkg.name

const cmd = command(
  appName,
  flag('--storage <dir>', 'custom storage directory for pear-runtime'),
  flag('--no-updates', 'disable OTA updates for this run'),
  flag('--message <text>', 'message sent to worker IPC stream')
)

cmd.parse(global.Bare.argv.slice(2))

const updates = cmd.flags.updates
const isDev = path.basename(Bare.argv[0] || '').startsWith('bare')
const storage = cmd.flags.storage || (isDev ? null : path.join(storageAPI.persistent(), appName))
const message = cmd.flags.message || 'hello from cli main'
const dir = storage || path.join(os.tmpdir(), 'pear', appName)
const store = new Corestore(path.join(dir, 'pear-runtime/corestore'))
const swarm = new Hyperswarm()
let pear = null

console.log(`${appName} v${pkg.version}`)
console.log(`Updates: ${updates === false ? 'disabled' : 'enabled'}`)

function getRunningAppPath() {
  if (global.Bare && Array.isArray(Bare.argv) && typeof Bare.argv[0] === 'string') {
    return path.resolve(Bare.argv[0])
  }

  if (typeof process !== 'undefined' && process.execPath) return process.execPath

  return null
}

function getPear({ storage, updates, store, swarm }) {
  if (pear !== null) return pear

  pear = new PearRuntime({
    dir,
    app: getRunningAppPath(),
    updates,
    version: pkg.version,
    upgrade: pkg.upgrade,
    name: appName,
    store,
    swarm
  })

  return pear
}

pear = getPear({ storage, updates, store, swarm })
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

const worker = PearRuntime.run('./workers/main.js')

worker.stdout.on('data', (data) => {
  console.log(`[worker:stdout] ${data}`)
})

worker.stderr.on('data', (data) => {
  console.error(`[worker:stderr] ${data}`)
})

worker.on('data', (data) => {
  console.log(`[worker:ipc] ${data}\n`)
})

worker.on('exit', (code) => {
  console.log(`[worker] exited with code ${code}`)
})

worker.write(Buffer.from(message))

global.Bare.on('SIGINT', () => {
  worker.destroy()
  global.Bare.exit(0)
})

console.log('CLI ready. Press Ctrl+C to stop.')
