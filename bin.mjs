import { command, flag } from 'paparam'
import storageAPI from 'bare-storage'
import pkg from './package.json'
import os from 'bare-os'
import { isWindows } from 'which-runtime'
import path from 'bare-path'
import App from './index.js'

const appName = pkg.productName || pkg.name

const cmd = command(
  appName,
  flag('--storage <dir>', 'custom storage directory for pear-runtime'),
  flag('--no-updates', 'disable OTA updates for this run')
)

cmd.parse(global.Bare.argv.slice(2))

const updates = cmd.flags.updates
const isDev = path.basename(Bare.argv[0]) === 'bare'
const storage = cmd.flags.storage || (isDev ? null : path.join(storageAPI.persistent(), appName))
const dir = storage || path.join(os.tmpdir(), 'pear', appName)

console.log(`${appName} v${pkg.version}`)
console.log(`Updates: ${updates === false ? 'disabled' : 'enabled'}`)

const app = new App({
  dir,
  app: isDev ? null : os.execPath(),
  updates,
  version: pkg.version,
  upgrade: pkg.upgrade,
  name: isWindows ? appName + '.exe' : appName
})

app.on('updating', () => console.log('[updater] getting new update'))
app.on('updating-delta', (delta) => console.log('[updater]', delta))
app.on('updated', () => console.log('[updater] update complete... applying'))
app.on('update-applied', () =>
  console.log('[updater] applied update, restart to run latest version')
)
app.on('error', (err) => console.error('[app:error]', err))

async function exit(code = 0) {
  Bare.exitCode = code
  await app.close()
}

global.Bare.on('SIGHUP', () => exit(129))
global.Bare.on('SIGINT', () => exit(130))
global.Bare.on('SIGQUIT', () => exit(131))
global.Bare.on('SIGTERM', () => exit(143))

await app.ready().then(
  () => console.log('\nCLI ready. Press Ctrl+C to stop.\n'),
  async (err) => {
    console.error('[app:error]', err)
    await app.close().catch(() => {})
    Bare.exit(1)
  }
)
