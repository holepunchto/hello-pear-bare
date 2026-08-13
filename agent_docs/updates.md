# OTA update behavior

> Read before touching the update flow or adding P2P data, or when debugging
> how OTA updates land. Only non-obvious, verified facts — the code and locked
> dependencies are the reference for everything else. Index:
> [AGENTS.md](../AGENTS.md).

Flow: stage a new build (README) → the next updates-enabled launch spawns the
updater daemon → the daemon replicates the drive, mirrors the bundle,
auto-applies, logs to `updates.log`, exits → the applied binary runs on the
**next** launch (the foreground that spawned the daemon has long exited).

Timing:

- A bundled updater starts an immediate drive check during initialization (dev
  daemons are unbundled and never check). After `App.ready()` resolves, if
  nothing is downloading, the daemon starts its `--update-window` timer (default
  30 000 ms); an `updating` event cancels that timeout so an in-progress download
  is never abandoned.
- Appends within the updater's first 60 s are processed immediately. With an
  `--update-window` longer than 60 s, later appends wait for the updater's
  per-process randomized delay (up to 1 h by default), which may outlive the
  daemon window.
- Only strictly-newer semver wins — rollback = stage a **higher** version (see
  `releases.md`).

Apply:

- `_applyUpdate()` wraps the apply in try/catch and emits `error` (into
  `updates.log`) on failure. No retry: the updater latches `applied = true`
  before swapping.
- Dev (`--updates`): the daemon spawns and is network-active (joins the swarm,
  replicates drive metadata) but `app` is `null` → not bundled → no download, no
  apply; it waits out its window and exits. The real flow needs a standalone
  build.

Replication / seeding:

- The daemon joins the drive with `client: true, server: false`; it does not
  advertise as a server, so run dedicated `pear seed`ers.
- Replication lives in the **daemon** process and dies with it. App P2P storage
  belongs in the foreground with its own Corestore/Hyperswarm — don't try to
  reuse the daemon's.
- **A stall may be the network, not the code**: `pear seed <link> --json` prints
  `firewalled`/`natType`. `natType: "Random"` indicates a randomized NAT and makes
  holepunching less reliable; two randomized peers cannot holepunch directly.
  Test two Bare Hyperswarm instances on a random topic before debugging app
  logic; use a local `hyperdht/testnet` for replication tests.

Fork surface (requires extending `App`'s constructor and the options it passes to
`PearRuntime`): updater opts `delay` (rollout-delay cap — distinct from
`--update-window`, which is App-level wait) and `bundled`; the `PearRuntime`
option `storage`; event `update-scheduled` is available but unwired
(`updating-delta` and `error` are already wired); `updater.next` is the staged
path for custom install logic. Because `App` supplies its own `Hyperswarm`, pass
`bootstrap` when constructing that swarm rather than only to `PearRuntime`. See
the `pear-runtime` / `pear-runtime-updater` READMEs.
