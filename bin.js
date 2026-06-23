const { command, flag } = require('paparam')
const storageAPI = require('bare-storage')
const pkg = require('./package.json')
const os = require('bare-os')
const { isWindows } = require('which-runtime')
const path = require('bare-path')
const Updates = require('./lib/updates.js')

const appName = pkg.productName || pkg.name

const cmd = command(
  appName,
  flag('--storage <dir>', 'custom storage directory for pear-runtime'),
  flag('--no-updates', 'disable OTA updates for this run')
)

cmd.parse(global.Bare.argv.slice(2))

const updates = cmd.flags.updates
const isDev = path.basename(Bare.argv[0] || '').startsWith('bare')
const storage = cmd.flags.storage || (isDev ? null : path.join(storageAPI.persistent(), appName))
const dir = storage || path.join(os.tmpdir(), 'pear', appName)

console.log(`${appName} v${pkg.version}`)
console.log(`Updates: ${updates === false ? 'disabled' : 'enabled'}`)

function getRunningAppPath() {
  if (isDev) return null
  return os.execPath()
}

const updatesResource = new Updates({
  dir,
  app: getRunningAppPath(),
  updates,
  version: pkg.version,
  upgrade: pkg.upgrade,
  name: isWindows ? appName + '.exe' : appName
})

updatesResource.on('storage', (storage) => console.log('Application storage:', storage))
updatesResource.on('updating', () => console.log('[updater] getting new update'))
updatesResource.on('updating-delta', (delta) => console.log('[updater]', delta))
updatesResource.on('updated', () => console.log('[updater] update complete... applying'))
updatesResource.on('update-applied', () =>
  console.log('[updater] applied update, restart to run latest version')
)
updatesResource.on('error', (err) => console.error('[updater:error]', err))

let tearingDown = false
async function teardown(code = 0) {
  if (tearingDown) return
  tearingDown = true
  await updatesResource.close()
  global.Bare.exit(code)
}

global.Bare.on('SIGHUP', () => teardown(129))
global.Bare.on('SIGINT', () => teardown(130))
global.Bare.on('SIGQUIT', () => teardown(131))
global.Bare.on('SIGTERM', () => teardown(143))

updatesResource.ready().then(
  () => console.log('CLI ready. Press Ctrl+C to stop.'),
  (err) => {
    console.error('[updater:error]', err)
    teardown(1)
  }
)
