# hello-pear-cli

Pear Runtime hello world boilerplate for a CLI project using **Bare** (not Node) with OTA updates and standalone binary builds via `bare-build`.

## Install

```sh
npm install
```

## Run

```sh
npm start
```

Disable updates for a run:

```sh
npm run start:no-updates
```

Use custom storage:

```sh
npm run start:custom-storage
```

## Updater Flow

Set `upgrade` in `package.json` to your release line pear link.

When an update is downloaded, apply it with:

```sh
bare index.js --apply-update
```

## Build Standalone

```sh
npm run build:standalone
```

Build all configured hosts:

```sh
npm run build:all
```

## Project Structure

- `index.js`: CLI entrypoint (Bare runtime)
- `lib/pear-runtime.js`: pear-runtime setup + updater/swarm wiring
- `workers/main.js`: example embedded bare worker via `pear.run(...)`
