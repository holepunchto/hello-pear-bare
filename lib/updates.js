const FramedStream = require('framed-stream')
const PearRuntime = require('pear-runtime')
const ReadyResource = require('ready-resource')

module.exports = class Updates extends ReadyResource {
  constructor({ dir, app, updates, version, upgrade, name }) {
    super()

    this.dir = dir
    this.app = app
    this.updates = updates
    this.version = version
    this.upgrade = upgrade
    this.name = name

    this.worker = null
    this.pipe = null
  }

  _open() {
    this.worker = PearRuntime.run(require.resolve('../workers/main.js'), [
      this.dir,
      this.app || '',
      String(this.updates),
      this.version,
      this.upgrade,
      this.name
    ])
    this.pipe = new FramedStream(this.worker)

    this.pipe.on('data', (data) => this._onmessage(data))
    this.pipe.on('error', (err) => this.emit('error', err))
    this.worker.on('error', (err) => this.emit('error', err))
    this.worker.on('exit', (code) => {
      if (code === 0 || this.closing !== null || this.closed) return
      this.emit('error', new Error(`Updates worker exited with code ${code}`))
    })
  }

  _close() {
    const pipe = this.pipe
    const worker = this.worker

    this.pipe = null
    this.worker = null

    pipe?.destroy()
    worker?.destroy()
  }

  _onmessage(data) {
    const message = data.toString()

    if (message === 'updating') {
      this.emit('updating')
      return
    }

    if (message === 'updated') {
      this.emit('updated')
      this._send('pear:applyUpdate')
      return
    }

    if (message === 'pear:updateApplied') {
      this.emit('update-applied')
      return
    }

    this.emit('message', message)
  }

  _send(message) {
    if (this.pipe === null) return
    this.pipe.write(message)
  }
}
