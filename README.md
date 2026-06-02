# hello-pear-bare

> Pear Hello World for Bare CLI with `pear-runtime`

End-to-end boilerplate for embedding [pear-runtime](https://github.com/holepunchto/pear-runtime) into a [Bare](https://github.com/holepunchto/bare) CLI with peer-to-peer OTA update support and standalone builds.

- Peer-to-Peer Over-the-Air updates
- Bare worker process via `PearRuntime.run(...)`
- Cross-platform standalone distributables via [`bare-build`](https://github.com/holepunchto/bare-build)

## Table of Contents

- OS Support
- Requirements
- Development
  - Install
  - Start
- Architecture
  - Updates
  - Workers
- Peer-to-Peer Deployments
- Scripts
- Project Structure
- Troubleshooting

## OS Support

- macOS
- Linux
- Windows

## Requirements

- `npm` via [Node.js](https://nodejs.org/)
- [pear](https://docs.pears.com/) - `npx pear`

## Development

### Install

```sh
npm install
```

### Start

Start app in development mode:

```sh
npm start
```

By default this repo starts with `--no-updates` in development to avoid local dev binaries being swapped while you iterate.

Enable updates for local flow testing:

```sh
npm start -- --updates
```

Send a custom worker message:

```sh
npm start -- --message "hello from dev"
```

## Architecture

### Updates

Updates are handled through `pear-runtime` and the configured `upgrade` link in `package.json`.

Per-run disable updates:

```sh
npm start -- --no-updates
```

### Workers

The main CLI runs a worker with `PearRuntime.run('./workers/main.js')` and communicates over IPC.

## Peer-to-Peer Deployments

Set the `upgrade` field in `package.json` to your distribution drive link, then follow the default flow from section 4 onward:

[hello-pear-electron: 4. Build Deployment Directory and onward](https://github.com/holepunchto/hello-pear-electron#4-build-deployment-directory-)

## Scripts

- `npm start` - run the Bare CLI in dev mode (`bare bin.js --no-updates`)
- `npm test` - run `brittle-bare` tests
- `npm run lint` - run prettier check and lunte
- `npm run format` - format repository with prettier
- `npm run make` - auto-detect host OS/arch and run matching build target
- `npm run make:darwin-arm64` - build standalone to `out/darwin-arm64`
- `npm run make:darwin-x64` - build standalone to `out/darwin-x64`
- `npm run make:linux-arm64` - build standalone to `out/linux-arm64`
- `npm run make:linux-x64` - build standalone to `out/linux-x64`
- `npm run make:win32-x64` - build standalone to `out/win32-x64`

## Project Structure

- `bin.js` - CLI entrypoint and runtime wiring
- `workers/main.js` - Bare worker example
- `scripts/make.js` - platform/arch build target selector
- `test/index.js` - brittle-bare tests

## Troubleshooting

- If updates do not trigger, verify `package.json` contains a valid `upgrade` Pear link and that peers are seeding the target drive.
- If `npm run make` fails on unsupported hosts, run a specific `make:<platform>-<arch>` script or build on a supported host.
- This template does not implement app-level data persistence; it is a minimal CLI + updater example.
