if (global.Bare && Bare.IPC) {
  Bare.IPC.write('hello from bare worker')

  Bare.IPC.on('data', (data) => {
    const input = data.toString().trim()
    Bare.IPC.write(`worker received: ${input}`)
  })
}
