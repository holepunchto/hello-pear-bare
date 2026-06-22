const PearRuntime = require('pear-runtime')
const FramedStream = require('framed-stream')

module.exports = startUpdater

function startUpdater({ dir, app, updates, version, upgrade, name }) {
  const worker = PearRuntime.run(require.resolve('../workers/main.js'), [
    dir,
    app || '',
    String(updates),
    version,
    upgrade,
    name
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

  const endWorker = async () => {
    try {
      worker.destroy()
    } catch {}
    try {
      pipe.destroy()
    } catch {}
  }

  return endWorker
}
