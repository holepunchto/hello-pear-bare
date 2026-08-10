# AGENTS.md

Holepunch's boilerplate for a **standalone Bare CLI with peer-to-peer OTA updates**
(no update server). This branch (`variant/single-thread`) is the **workerless**
variant: `app.js` constructs `PearRuntime` + Corestore + Hyperswarm directly in the
CLI process — no worker, no pipe protocol. Branch `main` runs the engine in a Bare
worker instead, `variant/daemon` in a detached updater daemon — each branch carries
its own AGENTS.md. The demo is tiny on purpose: `bin.mjs` (flags + logging) →
`app.js` (`App` ReadyResource owning the update engine); forks build their app
around `App`. Stack: **Bare runtime, not Node** (`bare-*` builtins), paparam,
`pear-runtime`, prettier + lunte, brittle-bare (one placeholder test). CI
lints/builds/tests on all six hosts; a dispatchable build workflow assembles the
by-arch deployment tarball. [README](README.md) = human manual; staging onward
delegates to hello-pear-electron's README.

Key facts: updates **auto-apply** — `App._applyUpdate()` runs on `updated`, with a
try/catch that emits `error` on failure. Dev runs are never "bundled" (`app` is
`null`), so the updater cannot
download or apply in dev — `--updates` only exercises drive replication; the real
update flow needs a standalone build.

## Commands

```sh
npm install
npm start                         # bare bin.mjs --no-updates
npm start -- --updates            # dev: replication only — no download/apply (unbundled)
npm start -- --storage <dir>      # custom storage dir
npm test                          # brittle-bare (placeholder test)
npm run lint                      # prettier . --check && lunte
npm run format                    # prettier . --write
npm run make                      # host build via bare-build → out/<platform-arch>/ (runs under Node)
npm run make:<platform>-<arch>    # darwin|linux|win32 × arm64|x64
```

Startup fails with `INVALID_URL` until `package.json#upgrade` holds a
well-formed `pear://` key (`pear touch`) — a **runtime** failure, not a
build-time one, and `--no-updates` doesn't avoid it (the updater parses the
link in its constructor). The key is public material (it only selects the
drive the updater follows), so committing a real dev key is safe and is the
intended flow.

## Contracts: editing one side breaks the other, often silently

- `App` constructor opts (`dir`, `app`, `updates`, `version`, `upgrade`, `name`)
  pass straight into `PearRuntime`; `store` and `swarm` must be passed together
  (pear-runtime throws on one without the other)
- The app-name chain: `pkg.name` ↔ `--name hello-pear-bare` hardcoded in all six
  `make:*` scripts ↔ hardcoded paths in `.github/workflows/build.yaml` ↔ the
  `by-arch/<host>/app/<name>` filename the updater looks up (`<name>.exe` on
  Windows → the copy+rename update path). A partial rename ships binaries the
  updater can't find
- Node builtins anywhere in this code ↔ `package.json#imports`: Bare has no
  `events` etc. — use `bare-*` modules or ship an imports map entry like
  `"events": {"bare": "bare-events", "default": "events"}` (hypercore and
  hyperswarm ship the same map)
- `package.json#upgrade` ↔ the release line every shipped binary follows

## Boundaries

You are a tool assisting the maintainer, not a substitute for them. Exceptions to
any rule here are the human's call: when a task seems to require one, stop and
surface the conflict instead of working around it. Exceptions are expected to be
rare.

- ✅ **Always:** if your change makes a _descriptive_ statement in AGENTS.md or
  `agent_docs/` false, update the doc and flag it in your summary; if it conflicts
  with a contract or boundary, stop and ask instead — never rewrite a rule to
  legalize your own change
- ✅ **Always:** check changes in a standalone build (`npm run make`) before
  calling work done — dev resolves modules at runtime while `--standalone`
  bundles by static traversal, so dynamic/computed `require()`s work in dev but
  are invisible to the bundler. Done = lint + tests pass and the standalone
  boots.
- ⚠️ **Ask first:** new deps; changing the auto-apply behavior
- 🚫 **Never:** deployment and publishing (`pear stage`,
  `pear provision`, `pear multisig`, `pear seed`), unless the user explicitly
  asked for exactly that in this session
- 🚫 **Never:** add flags/argv surfaces without declaring them to paparam in
  `bin.mjs` (unknown argv crashes the CLI at startup); use Node builtins without an
  `imports` entry (see contracts)

## Topic docs — match your task, read the doc BEFORE editing that area

Each `agent_docs/` file holds only code-verified facts you cannot deduce from this
repo's sources; each opens with its own scope statement. Routing:

- Editing `bin.mjs` or `app.js`, or debugging startup crashes
  → [`agent_docs/architecture.md`](agent_docs/architecture.md)
- Touching the update flow, adding P2P data, or debugging missing updates
  → [`agent_docs/updates.md`](agent_docs/updates.md)
- Touching `scripts/make.js`, the `make:*` scripts, or `.github/`; renaming the
  app; or cutting/troubleshooting a release
  → [`agent_docs/releases.md`](agent_docs/releases.md)
