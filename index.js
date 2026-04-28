const { command, flag } = require('paparam')
const fs = require('bare-fs')
const path = require('bare-path')
const storageAPI = require('bare-storage')
const pkg = require('./package.json')
const { createPearRuntime } = require('./lib/pear-runtime')
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
const isDev = (() => {
  const argv0 = global.Bare && Array.isArray(Bare.argv) ? Bare.argv[0] || '' : ''
  const base = path.basename(argv0)
  return base === 'bare' || base === 'bare.exe' || argv0.includes('/node_modules/bare/')
})()
const storage = cmd.flags.storage || (isDev ? null : path.join(storageAPI.persistent(), appName))
console.log(storage)
const message = cmd.flags.message || 'hello from cli main'

console.log(`${appName} v${pkg.version}`)
console.log(`Updates: ${updates === false ? 'disabled' : 'enabled'}`)

const pear = createPearRuntime({ storage, updates })

const out = (text) => {
  console.log(text)
}
const err = (text) => {
  console.error(text)
}

const worker = PearRuntime.run('./workers/main.js')

worker.stdout.on('data', (data) => {
  out(`[worker:stdout] ${data}`)
})

worker.stderr.on('data', (data) => {
  err(`[worker:stderr] ${data}`)
})

worker.on('data', (data) => {
  out(`[worker:ipc] ${data}\n`)
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
