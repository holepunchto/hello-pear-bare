# Architecture notes (`bin.mjs`, `app.js`)

> Read before editing `bin.mjs` or `app.js`, or when debugging daemon spawn,
> locking, or lifecycle behavior. Only non-obvious, code-verified facts —
> the code is the reference for everything else. Index: [AGENTS.md](../AGENTS.md).

Two run modes in one binary. Foreground: parse flags, `App.spawnUpdater()` (a
detached `bare-daemon` copy of itself), print ready, exit — no `App` instance, no
update events. Daemon (`--updater`, hidden flag): `runUpdater()` builds an `App`,
logs to `<storage>/updates.log` via bare-file-logger (1 MiB cap), and runs
`app.updater(wait)`. The code is small; read it for the wiring. Non-obvious facts:

- `app.updater(wait)` lifecycle: take `updater.lock` (`fsx.tryLock` — on failure
  return silently: one updater per storage dir), `ready()`, then wait until
  `update-applied` / `error` / `close`, or a `wait`-ms timeout (default 30 000) if
  no download has started; an `updating` event cancels the timeout so an
  in-progress download is never abandoned. Then exit.
- Consequence: updater errors (including the `INVALID_URL` placeholder-key
  failure) happen in the detached daemon and are visible **only in `updates.log`**
  — the foreground has no channel to them and reports ready regardless.
- Daemon spawn in dev is `bare bin.mjs --updater …` (`entrypoint = Bare.argv[1]`);
  packaged it's the binary itself with no entrypoint arg. This pairs with argv
  parsing `Bare.argv.slice(isDev ? 2 : 1)`.
- Dev detection strips the extension: `basename(argv[0], extname(argv[0])) ===
'bare'` — Windows-safe, but implemented differently from `main`'s check (the
  three branches have three isDev implementations).
- Storage: `--storage` > packaged `persistent()/<appName>` (bare-storage) > dev
  `<tmpdir>/pear/<appName>`; `App` `mkdirSync`s it. Inside: `pear-runtime/corestore`,
  `pear-runtime/next/<length>.<fork>/` (wiped on every bundled updater-daemon
  launch), `updater.lock`, `updates.log`. (`pear.storage` would default to
  `app-storage/` here, but nothing on this branch creates or uses it.)
- `App` events (daemon only): `updating`, `updating-delta`, `updated`,
  `update-applied`, `error`. Apply failures emit `error` (try/catch — no retry;
  the updater latches `applied` before swapping).
- Replication (`swarm.on('connection', (c) => store.replicate(c))`) and the drive
  join are gated behind `updates !== false` and live in the **daemon** process
  (see `updates.md` for the consequences).
