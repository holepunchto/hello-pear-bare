const { command, flag } = require('paparam')
const storageAPI = require('bare-storage')
const pkg = require('./package.json')
const os = require('bare-os')
const { isWindows } = require('which-runtime')
const path = require('bare-path')
const startUpdater = require('./lib/updater.js')

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

const endWroker = startUpdater({
  dir,
  app: getRunningAppPath(),
  updates,
  version: pkg.version,
  upgrade: pkg.upgrade,
  name: isWindows ? appName + '.exe' : appName
})

let tearingDown = false
async function teardown(code = 0) {
  if (tearingDown) return
  tearingDown = true
  await endWroker()
  global.Bare.exit(code)
}

global.Bare.on('SIGHUP', () => teardown(129))
global.Bare.on('SIGINT', () => teardown(130))
global.Bare.on('SIGQUIT', () => teardown(131))
global.Bare.on('SIGTERM', () => teardown(143))

console.log('CLI ready. Press Ctrl+C to stop.')
