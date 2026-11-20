# AGENTS.md

Holepunch's template for long-lived Bare CLI applications with peer-to-peer OTA updates.
`bin.mjs` owns the foreground CLI. A Bare worker thread runs the updater for the
lifetime of that CLI. The [README](README.md) covers setup and deployment. Where it
disagrees with these docs, follow these docs.

## Commands

```sh
npm ci
npm start                           # run from source, updates disabled
npm start -- --updates              # also join the update swarm (source runs never check)
npm start -- --storage ./out/dev    # use a separate storage directory
npm run lint                        # Prettier check and lunte
npm run format                      # write Prettier formatting
npm test                            # brittle-bare, one placeholder assertion
npm run make                        # host standalone in out/make/
npm run make:linux-x64              # unsigned target build in out/linux-x64/
```

The CLI runs until it gets a signal. Ctrl+C exits with code 130. `npm start` and
`node_modules/.bin/bare` start Bare through a Node shim that ignores SIGINT and
SIGTERM. From a script, run `./node_modules/.bin/bare bin.mjs --no-updates --storage <dir>`
and signal the shim's `bare` child (`pkill -INT -P <shim-pid>`). Signalling only
the npm or shim PID leaves Bare running and holding stdout.

**Set `package.json#upgrade` before starting the CLI.** Maintainers create the link
with `pear touch`. For a local startup check any well-formed key works:
`node -e "console.log('pear://' + require('hypercore-id-encoding').encode(require('crypto').randomBytes(32)))"`.
The worker constructs the updater even with `--no-updates`, and the updater parses
the link during construction. With the checked-in placeholder the worker throws an
uncaught `INVALID_URL` and the whole process aborts. The parent prints `CLI ready`
without waiting for the worker, so it always appears first and proves nothing. Look
for `Hello from worker`. A standalone embeds `package.json`, so rebuild after
changing the link or version. Standalones enable updates by default, keep data in
the per-user app directory and can replace their own executable. For a
startup-only check, run `./out/make/hello-pear-bare --no-updates --storage ./out/smoke`.

## Contracts

- `app.js` sends six positional arguments to `workers/main.js`: update flag,
  version, upgrade link, executable name, storage directory and executable path.
  The worker is an inlined copy of the shared `hello-pear-worker` package, so a
  contract change means changing it upstream and refreshing, or forking the worker.
  Then update both ends together.
- The parent and worker exchange strings over `FramedStream`. The parent sends
  `pear:applyUpdate` on `updated`. The worker replies `pear:updateApplied` when
  `applyUpdate()` resolves, which also happens when nothing was replaced.
- The worker looks up the payload at `/by-arch/<platform>-<arch>/app/<name>` in the
  upgrade drive, where `<name>` is `productName || name`, plus `.exe` on Windows.
  The installed binary reads its upgrade link and version from the package metadata
  embedded at build time.

## Boundaries

- A refresh overwrites hand edits to `workers/main.js` while its first-line source
  header is present. Follow the architecture notes to refresh or fork the worker.
  Keep the committed worker, its runtime dependencies and the lockfile together.
- For changes to worker startup or packaging, also build the host standalone and
  check for the worker greeting there.
- Give each concurrent run its own `--storage`. A second process on the same
  directory still greets but cannot lock its Corestore, and its updater fails
  silently. Every checkout shares the development default, and a standalone shares
  its default with an installed copy.
- Keep local test links and signing credentials out of commits. Restore
  `pear://<YOUR_KEY_HERE>` before committing. Seeding a throwaway drive for a local
  update test is fine. Staging, seeding and publishing a real release are separate
  maintainer operations.

## Topic docs

- Changing CLI flags, worker startup, IPC, storage or the inlined worker → [Architecture](agent_docs/architecture.md)
- Changing or debugging update handling, worker frames, discovery or executable replacement → [OTA updates](agent_docs/updates.md)
- Changing build targets, the package name, signing, CI or deployment artifacts → [Builds and releases](agent_docs/releases.md)
