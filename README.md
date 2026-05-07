# hello-pear-bare

Pear Runtime hello world boilerplate for a CLI project using [**Bare**](https://github.com/holepunchto/bare) with OTA updates and standalone binary builds via [`bare-build`](https://github.com/holepunchto/bare-build).

## Install

```sh
npm install
```

## Development

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

## Build

Build a standalone for a given arch (output at `out/<arch>`).

```sh
npm run build:<arch>
```

Pass `/out/<arch>` dirs to the [`pear-build`](https://github.com/holepunchto/pear-build) command to create a Deployment Folder for the updater to use.

## Updater Flow

Set the `upgrade` field in the package.json to your distribution drive link and follow the [default update flow](https://github.com/holepunchto/hello-pear-electron#4-build-deployment-directory-)

## Project Structure

- `index.js`: CLI entrypoint (Bare runtime)
- `lib/pear-runtime.js`: pear-runtime setup + updater/swarm wiring
- `workers/main.js`: example embedded bare worker via `pear.run(...)`
