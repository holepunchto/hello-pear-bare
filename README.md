# hello-pear-bare

> Pear Hello World for Standalone Bare Processes with `pear-runtime` worker

End-to-end boilerplate for embedding [pear-runtime] into the [Bare] worker of a [Bare] CLI with peer-to-peer OTA update support.

This boilerplate uses the companion [`hello-pear-worker`][hello-pear-worker] as a reusable cross-platform local backend. Keeping networking, storage and updates in a separate worker lets mobile apps, desktop UIs and standalone Bare applications share the same backend implementation while each parent owns its platform-specific interface.

- Peer-to-Peer deployment with [pear][pear-docs] CLI
- Peer-to-Peer Over-the-Air updates with [`pear-runtime`][pear-runtime] module
- Bare worker thread via `PearRuntime.run(...)`
- Cross-platform standalone distributables via [`bare-build`][bare-build]

## Variants

All three branches are standalone Bare CLI boilerplates with the same peer-to-peer deployment and automatic OTA update model. They differ in where the update engine runs, how isolated it is from the application and whether it can outlive the foreground command.

| Branch                                                                                               | Boilerplate type | Runtime topology                                                           | Best suited for                                                             |
| ---------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| (current) [`main`](https://github.com/holepunchto/hello-pear-bare/tree/main)                         | Worker-thread    | The CLI and a dedicated Bare worker run as separate threads in one process | Long-running applications that benefit from isolation or a reusable backend |
| [`variant/single-thread`](https://github.com/holepunchto/hello-pear-bare/tree/variant/single-thread) | In-process       | The application and update engine share one Bare thread                    | Small applications that favor direct control and the fewest moving parts    |
| [`variant/daemon`](https://github.com/holepunchto/hello-pear-bare/tree/variant/daemon)               | Detached updater | The foreground command starts a temporary background updater process       | Short-lived commands that may exit before an update check can complete      |

### `main`: worker-thread boilerplate

The CLI starts [`hello-pear-worker`][hello-pear-worker] in a dedicated Bare worker thread and communicates with it over framed IPC. Networking, storage and updates stay off the application thread, while the worker lifecycle remains tied to the foreground process. This is the general-purpose variant and the best starting point when the backend may also be shared with desktop or mobile frontends.

### `variant/single-thread`: in-process boilerplate

The application constructs `PearRuntime`, `Corestore` and `Hyperswarm` directly in its foreground thread. There is no worker, daemon or IPC protocol, which makes this the smallest and easiest variant to customize. Update work shares the application's lifecycle and failure boundary, so the process must remain alive long enough to receive an update.

### `variant/daemon`: detached-updater boilerplate

The foreground command starts a detached copy of itself in updater mode and can exit immediately. The daemon waits for an update during a bounded window; once a download starts, it remains alive until the update is applied or fails. Progress is recorded in `updates.log`. This is intended for one-shot or short-lived commands; the updated binary runs on a later invocation.

All variants apply updates automatically and run the updated binary on the next launch. Development runs are unbundled, so `--updates` exercises replication but cannot replace the local executable; end-to-end updates require a standalone build.

## Table of Contents

- [Variants](#variants)
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

Updates are managed by the `App` class in `app.js`, which wraps the updater lifecycle as a ready resource and emits update events for `bin.mjs` to log.

The worker uses `pear-runtime` and the configured `upgrade` link in `package.json`.

Per-run disable updates:

```sh
npm start -- --no-updates
```

### Workers

The main CLI starts `workers/main.js` in a Bare worker thread and communicates with it over framed IPC.

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
- `npm run make` - build a standalone for the current host to `out/make`
- `npm run make:darwin-arm64` - build standalone to `out/darwin-arm64`
- `npm run make:darwin-x64` - build standalone to `out/darwin-x64`
- `npm run make:linux-arm64` - build standalone to `out/linux-arm64`
- `npm run make:linux-x64` - build standalone to `out/linux-x64`
- `npm run make:win32-arm64` - build standalone to `out/win32-arm64`
- `npm run make:win32-x64` - build standalone to `out/win32-x64`

Set `HOST` to override the target used by `npm run make`, for example:

```sh
HOST=linux-arm64 npm run make
```

### Signing Standalones

`npm run make` supports the signing credentials provided by the [`make-pear-app` GitHub Action][make-pear-app]:

- On macOS, set `MAC_CODESIGN_IDENTITY` to sign with the hardened runtime. Set `KEYCHAIN_PROFILE` as well to submit the signed executable to Apple's notary service.
- On Windows, set `WINDOWS_CERT_SHA1` to sign with the matching certificate from the current user's certificate store.

The platform-specific `make:<platform>-<arch>` scripts build unsigned standalones.

## Project Structure

- `bin.mjs` - CLI entrypoint and runtime wiring
- `app.js` - update resource used by the entrypoint
- `workers/main.js` - Bare worker example
- `scripts/make.js` - standalone builder with host selection, signing, and notarization support
- `test/index.js` - brittle-bare tests

## Troubleshooting

- `INVALID_URL: Invalid URL 'pear://<YOUR_KEY_HERE>'` means the placeholder `upgrade` link in `package.json` has not been replaced. Run `pear touch`, then put the generated `pear://...` link in `package.json`.
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
[make-pear-app]: https://github.com/holepunchto/actions/tree/main/make-pear-app
