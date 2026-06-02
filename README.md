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
  - Install Dependencies
  - Create an upgrade link
  - Start
- Architecture
  - Updates
  - Workers
- Peer-to-Peer Deployments
- Installing Distributables
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

### Install Dependencies

```sh
npm install
```

### Create an upgrade link

This template expects `package.json` to contain a valid `pear://` link in the `upgrade` field. If it still contains the placeholder `pear://<YOUR_KEY_HERE>`, startup will fail with `INVALID_URL`.

Create a link with [`pear touch`](https://docs.pears.com/reference/cli.html#pear-touch-flags-channel):

```sh
pear touch
```

Copy the generated `pear://...` link into the `upgrade` field in `package.json`.

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

## Installing Distributables

Once the `pear://<key>` upgrade link is seeding the build deployment folder the CLI standalone binary can be installed peer-to-peer directly onto the system with Pear:

```sh
npx pear-install pear://<key>
```

## Troubleshooting

- `INVALID_URL: Invalid URL 'pear://<YOUR_KEY_HERE>'` means the placeholder `upgrade` link in `package.json` has not been replaced. Run `pear touch`, then put the generated `pear://...` link in `package.json`.
- If updates do not trigger, verify `package.json` contains a valid `upgrade` Pear link and that peers are seeding the target drive.
- If `npm run make` fails on unsupported hosts, run a specific `make:<platform>-<arch>` script or build on a supported host.
- This template does not implement app-level data persistence; it is a minimal CLI + updater example.
