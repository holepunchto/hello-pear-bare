import { command, flag } from 'paparam'
import { persistent } from 'bare-storage'
import os from 'bare-os'
import { isWindows } from 'which-runtime'
import path from 'bare-path'
import pkg from './package.json'
import App from './app.js'

const appName = pkg.productName || pkg.name

const cmd = command(
  appName,
  flag('--storage <dir>', 'custom storage directory for pear-runtime'),
  flag('--no-updates', 'disable OTA updates for this run')
)

cmd.parse(Bare.argv.slice(2))

const updates = cmd.flags.updates
const isDev = path.basename(Bare.argv[0]) === 'bare'
const storage = cmd.flags.storage || (isDev ? null : path.join(persistent(), appName))
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

Bare.on('SIGHUP', () => app.exit(129))
Bare.on('SIGINT', () => app.exit(130))
Bare.on('SIGQUIT', () => app.exit(131))
Bare.on('SIGTERM', () => app.exit(143))

try {
  await app.ready()
  console.log('\nCLI ready. Press Ctrl+C to stop.\n')
} catch (err) {
  console.error('[app:error]', err)
  await app.close().catch(() => {})
  Bare.exit(1)
}
