const path = require('bare-path')
const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const PearRuntime = require('pear-runtime')

module.exports = startUpdater

function startUpdater({ dir, app, updates, version, upgrade, name }) {
  const store = new Corestore(path.join(dir, 'pear-runtime', 'corestore'))
  const swarm = new Hyperswarm()

  const pear = new PearRuntime({
    dir,
    app,
    updates,
    version,
    upgrade,
    name,
    store,
    swarm
  })

  if (updates !== false) {
    pear.updater.on('updating', () => console.log('[updater] getting new update'))

    pear.updater.on('updating-delta', (d) => console.log('[updater]', d))

    pear.updater.on('updated', async () => {
      console.log('[updater] update complete... applying')
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

  const endWorker = async () => {
    await pear.close()
  }

  return endWorker
}
