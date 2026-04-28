# hello-pear-cli

Pear Runtime hello world boilerplate for a CLI project using [**Bare**](https://github.com/holepunchto/bare) with OTA updates and standalone binary builds via [`bare-build`](https://github.com/holepunchto/bare-build).

## Install

```sh
npm install
```

## Run

```sh
npm start
```

Disable updates:

```sh
npm start -- --no-updates
```

Use custom storage:

```sh
npm start -- --storage ./storageDir
```

## Updater Flow

Set `upgrade` in `package.json` to your release line pear link.

When an update is downloaded, it will be applied directly. restart to launch the updated executable

## Build

Build a standalone for a given arch (output at out/<arch>).

```sh
npm run build:<arch>
```

## Project Structure

- `index.js`: CLI entrypoint (Bare runtime)
- `lib/pear-runtime.js`: pear-runtime setup + updater/swarm wiring
- `workers/main.js`: example embedded bare worker via `pear.run(...)`
