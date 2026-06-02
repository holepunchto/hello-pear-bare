#!/usr/bin/env node

const { spawnSync } = require('node:child_process')

const supportedPlatforms = new Set(['darwin', 'linux', 'win32'])
const supportedArchs = new Set(['x64', 'arm64'])

const { platform, arch } = process

if (!supportedPlatforms.has(platform) || !supportedArchs.has(arch)) {
  console.error(
    `Unsupported build host: ${platform}-${arch}. Supported hosts: darwin-x64, darwin-arm64, linux-x64, linux-arm64, win32-x64, win32-arm64.`
  )
  process.exit(1)
}

const script = `make:${platform}-${arch}`
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const result = spawnSync(npmCmd, ['run', script], { stdio: 'inherit' })

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)
