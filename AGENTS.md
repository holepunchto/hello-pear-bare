# AGENTS.md

Holepunch's template for long-lived Bare CLI applications with peer-to-peer OTA updates.
`bin.mjs` owns the foreground CLI. A Bare worker thread runs the updater for the
lifetime of that CLI. The [README](README.md) covers setup and deployment.

## Commands

```sh
npm ci
npm start                           # run from source, updates disabled
npm start -- --updates              # enable worker networking in development
npm start -- --storage ./out/dev    # use a separate storage directory
npm run lint                        # Prettier check and lunte
npm run format                      # write Prettier formatting
npm test                            # brittle-bare, one placeholder assertion
npm run make                        # host standalone in out/make/
npm run make:linux-x64              # unsigned target build in out/linux-x64/
```

**Set `package.json#upgrade` before starting the CLI.** Use a valid `pear://` link
from `pear touch`. The worker constructs the updater even with `--no-updates`, and
the updater parses the link during construction. The checked-in placeholder fails
at this point. Look for `Hello from worker` when checking startup. The parent can
print `CLI ready` before the worker has loaded. Standalones enable updates by
default. Pass `--no-updates` for a startup-only check.

## Contracts

- `app.js` sends six positional arguments to `workers/main.js`. Keep both ends
  in sync when changing the update flag, version, upgrade link, executable name,
  storage directory or executable path.
- The parent and worker exchange strings over `FramedStream`. The parent sends
  `pear:applyUpdate` on `updated` and announces success on `pear:updateApplied`.
- The worker looks up the payload by the configured app name, including `.exe`
  on Windows. The installed binary reads its upgrade link and version from the
  package metadata embedded at build time.

## Boundaries

- For shared worker changes, follow the refresh procedure in the architecture
  notes. Keep the committed worker, its runtime dependencies and the lockfile together.
- For changes to worker startup or packaging, build the host standalone and check
  for the worker greeting there as well. Use separate storage for concurrent runs.
- Keep local test links and signing credentials out of commits. Staging, seeding
  and publishing a release are separate maintainer operations.

## Topic docs

- Changing CLI flags, worker startup, IPC or the inlined worker → [Architecture](agent_docs/architecture.md)
- Debugging discovery, update messages or executable replacement → [OTA updates](agent_docs/updates.md)
- Changing build targets, signing, CI or deployment artifacts → [Builds and releases](agent_docs/releases.md)
