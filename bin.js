const { command, flag } = require('paparam')
const storageAPI = require('bare-storage')
const pkg = require('./package.json')
const os = require('bare-os')
const { isWindows } = require('which-runtime')
const path = require('bare-path')
const PearRuntime = require('pear-runtime')
const FramedStream = require('framed-stream')

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

const worker = PearRuntime.run(require.resolve('./workers/main.js'), [
  dir,
  getRunningAppPath() || '',
  String(updates),
  pkg.version,
  pkg.upgrade,
  isWindows ? appName + '.exe' : appName
])
const pipe = new FramedStream(worker)

pipe.on('data', async (data) => {
  const event = data.toString()
  console.log(`[worker:ipc] ${event}\n`)
  if (event === 'updated') {
    pipe.write('pear:applyUpdate')
  } else if (event === 'pear:updateApplied') {
    console.log('[updater] applied update, restart to run latest version')
  }
})

worker.on('exit', (code) => {
  console.log(`[worker] exited with code ${code}`)
})

pipe.write('hello from cli main')

let tearingDown = false
async function teardown(code) {
  if (tearingDown) return
  tearingDown = true
  try {
    worker.destroy()
  } catch {}
  try {
    pipe.destroy()
  } catch {}
  global.Bare.exit(code)
}

global.Bare.on('SIGHUP', () => teardown(129))
global.Bare.on('SIGINT', () => teardown(130))
global.Bare.on('SIGQUIT', () => teardown(131))
global.Bare.on('SIGTERM', () => teardown(143))

console.log('CLI ready. Press Ctrl+C to stop.')
