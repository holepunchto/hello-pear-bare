# Architecture notes (`bin.mjs`, `app.js`)

> Read before editing `bin.mjs` or `app.js`, or when debugging startup
> crashes. Only non-obvious, code-verified facts —
> the code is the reference for everything else. Index: [AGENTS.md](../AGENTS.md).

`bin.mjs` (ESM, runs under Bare) parses flags and wires logging; `app.js` exports
`App` (a ReadyResource) that owns the whole update engine in-process: Corestore at
`<dir>/pear-runtime/corestore`, a Hyperswarm, and `PearRuntime` — all created in
`_open()`, all torn down in `_close()` (swarm → pear → store, in that order). The
code is small; read it for the wiring. Non-obvious facts:

- Dev detection on this branch is `basename(Bare.argv[0]) === 'bare'` — **it does
  not match `bare.exe`**, so a Windows dev run misdetects as packaged and then
  crashes at startup: argv is parsed with `Bare.argv.slice(isDev ? 2 : 1)`, so the
  script path lands in the parsed argv as an unknown positional and paparam bails
  with `UNKNOWN_ARG`. `main` and `variant/daemon` carry Windows-safe checks; this
  branch does not. (paparam throws the same way on any unknown flag/positional.)
- Storage: `--storage` > packaged `persistent()/<appName>` (bare-storage) > dev
  `<tmpdir>/pear/<appName>`. Inside: `pear-runtime/corestore`,
  `pear-runtime/next/<length>.<fork>/` (wiped on every bundled, updates-enabled
  launch), `app-storage/` (`app.pear.storage`, logged at startup — pass it to your
  own storage).
- `App` events: `updating`, `updating-delta` (wired straight from the updater),
  `updated`, `update-applied`, `error` (runtime + updater errors, and apply
  failures).
