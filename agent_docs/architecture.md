# Architecture notes (`bin.mjs`, `app.js`, `workers/main.js`)

> Read before editing `bin.mjs`, `app.js`, or `workers/main.js`, or when
> debugging startup crashes or worker behavior. Only non-obvious, code-verified facts —
> the code is the reference for everything else. Index: [AGENTS.md](../AGENTS.md).

`bin.mjs` (ESM, runs under Bare) parses flags and wires logging; `app.js` exports
`App` (a ReadyResource) which spawns `workers/main.js` — a one-line
`require('hello-pear-worker')` — and speaks the framed pipe protocol. The code is
small; read it for the wiring. Non-obvious facts:

- Dev detection: `isDev = basename(Bare.argv[0]) === 'bare'/'bare.exe'`; argv is
  parsed with `Bare.argv.slice(isDev ? 2 : 1)`. paparam throws on unknown
  flags/positionals → startup crash.
- Storage: `--storage` > packaged `persistent()/<appName>` (bare-storage) > dev
  `<tmpdir>/pear/<appName>`. Inside: `pear-runtime/corestore`,
  `pear-runtime/next/<length>.<fork>/` (wiped on every bundled, updates-enabled
  launch), `app-storage/` (suggested `pear.storage` for app data).
- `App` events: `updating`, `updated` (then auto-sends `pear:applyUpdate`),
  `update-applied`, `message` (any other pipe string), `error` (pipe/IPC stream
  errors). Two listeners are dead code: `updating-delta` in `bin.mjs` (the worker
  forwards only the three protocol strings) and `IPC.on('exit')` in `app.js`
  (under Bare the worker is a thread and its IPC never emits `exit`). Worker
  crashes — including the `INVALID_URL` placeholder-key failure — bypass `App`
  and surface as an uncaught error in the parent.
- The worker is a module for cross-platform reuse (desktop + mobile). For a
  single-platform project, copy `hello-pear-worker/index.js` into
  `workers/main.js` and develop it in-project (per that package's README). Once
  in-project, worker code resolves against **this** `package.json` — Node builtins
  need an `imports` entry there (see AGENTS.md contracts).
