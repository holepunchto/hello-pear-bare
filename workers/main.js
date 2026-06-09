const os = require('bare-os')
const Pipe = require('bare-pipe')

const channelFd = Number(os.getEnv('BARE_CHANNEL_FD'))
const channelMode = os.getEnv('BARE_CHANNEL_SERIALIZATION_MODE')

if (!Bare.IPC && Number.isFinite(channelFd) && channelMode === 'binary') {
  Bare.IPC = new Pipe(channelFd, { ipc: true })
}

Bare.IPC.write('hello from bare worker')

Bare.IPC.on('data', (data) => {
  const input = data.toString().trim()
  Bare.IPC.write(`worker received: ${input}`)
})
