# AGENTS.md

Holepunch's boilerplate for a **standalone Bare program with peer-to-peer OTA updates**
(no update server). This branch (`variant/daemon`) is for **short-lived programs**: the foreground command never runs the updater —
launching the program detach-spawns a copy of itself (`bare-daemon`) with a hidden `--updater`
flag, then exits; the daemon checks for an update within a window, auto-applies,
logs to `<storage>/updates.log`, and exits. Long-lived programs fit [main](https://github.com/holepunchto/hello-pear-bare/tree/main) (Bare
worker) or [variant/single-thread](https://github.com/holepunchto/hello-pear-bare/tree/variant/single-thread) (in-process) better — each branch carries its
own AGENTS.md. `bin.mjs` owns terminal/CLI concerns (flags, output, and signals);
`app.js` exports `App`, where program logic belongs, and also owns the detached
updater lifecycle. Stack: **Bare runtime, not Node** (`bare-*` builtins), paparam,
`pear-runtime`, `bare-daemon`, prettier + lunte, brittle-bare (one placeholder
test). CI lints once and builds/tests on all six hosts; a dispatchable build
workflow assembles the by-arch deployment tarball. [README](README.md) = human
manual; staging onward delegates to hello-pear-electron's README.

Key facts: only one updater runs per storage dir (`updater.lock` file lock; a
second daemon exits silently). Updater progress and errors go **only** to
`<storage>/updates.log` — the foreground prints update status and readiness only.
Dev runs are never "bundled" (`app` is `null`), so the daemon cannot download or
apply in dev — it joins the swarm, replicates drive metadata, waits out its window
and exits; the real update flow needs a standalone build.

## Commands

```sh
npm install
npm start                              # bare bin.mjs --no-updates
npm start -- --updates                 # dev: spawns the daemon, but no download/apply (unbundled)
npm start -- --updates --update-window 60000   # daemon wait in ms (default 30000)
npm start -- --storage <dir>           # custom storage dir
npm test                               # brittle-bare (placeholder test)
npm run lint                           # prettier . --check && lunte
npm run format                         # prettier . --write
npm run make                           # host build via bare-build → out/<platform-arch>/ (runs under Node)
npm run make:<platform>-<arch>         # darwin|linux|win32 × arm64|x64
```

The placeholder `package.json#upgrade` key fails only when the daemon actually
runs (updates enabled): the daemon dies with `INVALID_URL`, visible **only in
`updates.log`** — the default `npm start` (`--no-updates`) never touches the key,
and the foreground still prints "CLI ready" either way. Fix with `pear touch` — the key is public material (it only selects
the drive the updater follows), so committing a real dev key is safe.

## Contracts: editing one side breaks the other, often silently

- `App.spawnUpdater()` builds the daemon argv (`--updater`, `--storage`,
  `--update-window`) ↔ the paparam flag declarations in `bin.mjs` — adding or
  renaming daemon flags must change both sides
- The `App` constructor destructures a fixed option set and passes it to
  `PearRuntime`; adding runtime/updater options requires changing both sides.
  `store` and `swarm` must be passed together (pear-runtime throws on one without
  the other)
- The app-name chain: `appName` (`pkg.productName || pkg.name`) ↔ the
  `hello-pear-bare` value passed to `--name` in all six `make:*` scripts ↔
  hardcoded paths in
  `.github/workflows/build.yaml` ↔ the `by-arch/<host>/app/<name>` filename the
  updater looks up (`<name>.exe` on Windows → the copy+rename update path). A
  partial rename ships binaries the updater can't find
- Node builtins in Bare-bundled runtime code ↔ `package.json#imports`: Bare has
  no `events` etc. — use `bare-*` modules or ship an imports map entry like
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
- ⚠️ **Ask first:** new deps; changing the auto-apply or daemon lifecycle
- 🚫 **Never:** deployment and publishing (`pear stage`,
  `pear provision`, `pear multisig`, `pear seed`), unless the user explicitly
  asked for exactly that in this session
- 🚫 **Never:** add flags/argv surfaces without declaring them to paparam in
  `bin.mjs` (unknown argv crashes the CLI at startup — and the daemon reuses the
  same parser); use Node builtins in Bare-bundled runtime code without an
  `imports` entry (see contracts)

## Topic docs — match your task, read the doc BEFORE editing that area

Each `agent_docs/` file collects non-obvious, verified facts and opens with its own
scope statement. Routing:

- Editing `bin.mjs` or `app.js`, or debugging the foreground/daemon lifecycle
  → [`agent_docs/architecture.md`](agent_docs/architecture.md)
- Touching the update flow, adding P2P data, or debugging missing updates
  → [`agent_docs/updates.md`](agent_docs/updates.md)
- Touching `scripts/make.js`, the `make:*` scripts, or `.github/`; renaming the
  app; or cutting/troubleshooting a release
  → [`agent_docs/releases.md`](agent_docs/releases.md)
