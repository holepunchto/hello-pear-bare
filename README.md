# hello-pear-bare

> Pear Hello World for standalone Bare processes with `pear-runtime`

End-to-end boilerplate for embedding [pear-runtime] in a standalone [Bare] CLI with peer-to-peer OTA update support.

This variant runs the reusable [`hello-pear-worker`][hello-pear-worker] backend in a separate Bare worker, keeping networking, storage and updates outside the CLI process.

- Peer-to-Peer deployment with [pear][pear-docs] CLI
- Peer-to-Peer Over-the-Air updates with [`pear-runtime`][pear-runtime] module
- Separate Bare worker via `PearRuntime.run(...)`
- Cross-platform standalone distributables via [`bare-build`][bare-build]

## Variants

- (current) [`main`](https://github.com/holepunchto/hello-pear-bare/tree/main): runs `pear-runtime` in a Bare worker and communicates over framed IPC.
- [`single-thread`](https://github.com/holepunchto/hello-pear-bare/tree/variant/single-thread): runs `pear-runtime` directly in the CLI process.
- [`daemon`](https://github.com/holepunchto/hello-pear-bare/tree/variant/daemon): runs `pear-runtime` in a detached updater daemon.

## Table of Contents

- [OS Support](#os-support)
- [Requirements](#requirements)
- [Development](#development)
  - [Install Dependencies](#install-dependencies)
  - [Create an upgrade link](#create-an-upgrade-link)
  - [Start](#start)
- [Architecture](#architecture)
  - [Runtime Model](#runtime-model)
  - [Updates](#updates)
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

OTA updates require `package.json` to contain a valid `pear://` link in the `upgrade` field. Replace the `pear://<YOUR_KEY_HERE>` placeholder before enabling updates.

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

### Runtime Model

The CLI starts `workers/main.js` with `PearRuntime.run(...)`. The `App` resource owns the worker and communicates with it over framed IPC. The worker loads `hello-pear-worker`.

### Updates

The worker consumes the `upgrade` link from `package.json`, forwards updater lifecycle events over IPC and applies downloaded updates when requested by the parent.

Per-run disable updates:

```sh
npm start -- --no-updates
```

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
- `app.js` - worker lifecycle and IPC resource
- `workers/main.js` - worker entrypoint loading `hello-pear-worker`
- `scripts/make.js` - platform/arch build target selector
- `test/index.js` - brittle-bare tests

## Troubleshooting

- `INVALID_URL: Invalid URL 'pear://<YOUR_KEY_HERE>'` means updates were enabled before the placeholder `upgrade` link in `package.json` was replaced. Run `pear touch`, then put the generated `pear://...` link in `package.json`.
- If updates do not trigger, verify `package.json` contains a valid `upgrade` Pear link and that peers are seeding the target drive.
- If `npm run make` fails on unsupported hosts, run a specific `make:<platform>-<arch>` script or build on a supported host.
- This template does not implement app-level data persistence; it is a minimal CLI + updater example.

<!-- Reference Links -->

[pear-docs]: https://docs.pears.com
[hello-pear-worker]: https://github.com/holepunchto/hello-pear-worker
[pear-runtime]: https://github.com/holepunchto/pear-runtime
[Bare]: https://github.com/holepunchto/bare
[nodejs]: https://nodejs.org
[bare-build]: https://github.com/holepunchto/bare-build
