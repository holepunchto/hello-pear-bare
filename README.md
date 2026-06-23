# hello-pear-bare

> Pear Hello World for Standalone Bare Processes with `pear-runtime` worker

End-to-end boilerplate for embedding [pear-runtime] into the worker of a [Bare] CLI with peer-to-peer OTA update support.

- Peer-to-Peer deployment with [pear][pear-docs] CLI
- Peer-to-Peer Over-the-Air updates with [`pear-runtime`][pear-runtime] module
- Bare worker process via `PearRuntime.run(...)`
- Cross-platform standalone distributables via [`bare-build`][bare-build]

## Variants

- (current) [`main`](https://github.com/holepunchto/hello-pear-bare/tree/main): runs `pear-runtime` in a Bare worker thread.
- [`single-thread`](https://github.com/holepunchto/hello-pear-bare/tree/variant/single-thread): runs `pear-runtime` in the main thread.

## Table of Contents

- [OS Support](#os-support)
- [Requirements](#requirements)
- [Development](#development)
  - [Install Dependencies](#install-dependencies)
  - [Create an upgrade link](#create-an-upgrade-link)
  - [Start](#start)
- [Architecture](#architecture)
  - [Updates](#updates)
  - [Workers](#workers)
- [Peer-to-Peer Deployments](#peer-to-peer-deployments)
- [Installing Distributables](#installing-distributables)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

## OS Support

- **macOS** — arm64, x64
- **Linux** — arm64, x64
- **Windows** — arm64, x64

## Requirements

- `npm` via [Node.js][nodejs]
- [pear][pear-docs] - `npx pear`

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

## Architecture

### Updates

Updates are managed by the `App` class in `index.js`, which wraps the updater lifecycle as a ready resource and emits update events for `bin.mjs` to log.

The worker uses `pear-runtime` and the configured `upgrade` link in `package.json`.

Per-run disable updates:

```sh
npm start -- --no-updates
```

### Workers

The main CLI starts `workers/main.js` as a Bare sidecar and communicates with it over framed IPC.

## Peer-to-Peer Deployments

Use the [`pear`][pear-docs] CLI to deploy applications.

Set the `upgrade` field in `package.json` to your distribution drive link, then follow the default flow from section 4 onward:

[hello-pear-electron: 4. Build Deployment Directory and onward](https://github.com/holepunchto/hello-pear-electron#4-build-deployment-directory-)

## Installing Distributables

Once the `pear://<key>` upgrade link is seeding the build deployment folder the CLI standalone binary can be installed peer-to-peer directly onto the system with Pear:

```sh
npx pear-install pear://<key>
```

## Scripts

- `npm start` - run the Bare CLI in dev mode (`bare bin.mjs --no-updates`)
- `npm test` - run `brittle-bare` tests
- `npm run lint` - run prettier check and lunte
- `npm run format` - format repository with prettier
- `npm run make` - auto-detect host OS/arch and run matching build target
- `npm run make:darwin-arm64` - build standalone to `out/darwin-arm64`
- `npm run make:darwin-x64` - build standalone to `out/darwin-x64`
- `npm run make:linux-arm64` - build standalone to `out/linux-arm64`
- `npm run make:linux-x64` - build standalone to `out/linux-x64`
- `npm run make:win32-arm64` - build standalone to `out/win32-arm64`
- `npm run make:win32-x64` - build standalone to `out/win32-x64`

## Project Structure

- `bin.mjs` - CLI entrypoint and runtime wiring
- `index.js` - update resource used by the entrypoint
- `workers/main.js` - Bare worker example
- `scripts/make.js` - platform/arch build target selector
- `test/index.js` - brittle-bare tests

## Troubleshooting

- `INVALID_URL: Invalid URL 'pear://<YOUR_KEY_HERE>'` means the placeholder `upgrade` link in `package.json` has not been replaced. Run `pear touch`, then put the generated `pear://...` link in `package.json`.
- If updates do not trigger, verify `package.json` contains a valid `upgrade` Pear link and that peers are seeding the target drive.
- If `npm run make` fails on unsupported hosts, run a specific `make:<platform>-<arch>` script or build on a supported host.
- This template does not implement app-level data persistence; it is a minimal CLI + updater example.

<!-- Reference Links -->

[pear-docs]: https://docs.pears.com
[pear-runtime]: https://github.com/holepunchto/pear-runtime
[Bare]: https://github.com/holepunchto/bare
[nodejs]: https://nodejs.org
[bare-build]: https://github.com/holepunchto/bare-build
