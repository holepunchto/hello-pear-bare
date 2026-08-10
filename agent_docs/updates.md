# OTA update behavior

> Read before touching the update flow or adding P2P data, or when debugging
> how OTA updates land. Only non-obvious, code-verified facts —
> the code is the reference for everything else. Index: [AGENTS.md](../AGENTS.md).

Flow: stage a new build (README) → the next updates-enabled launch spawns the
updater daemon → the daemon replicates the drive, mirrors the bundle,
auto-applies, logs to `updates.log`, exits → the applied binary runs on the
**next** launch (the foreground that spawned the daemon has long exited).

Timing:

- The updater checks the drive immediately at daemon start (bundled launches
  only — dev daemons never check). If nothing is downloading, the daemon exits
  after `--update-window` ms (default 30 000); an `updating` event cancels that
  timeout, so an in-progress download is never abandoned.
- Appends that land while the daemon is alive are processed immediately — the
  daemon's whole life fits inside the updater's 60 s boot grace, so the ≤1 h
  randomized append delay of the long-lived variants effectively never applies
  here.
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

- The daemon joins the drive client-only and never seeds — run dedicated
  `pear seed`ers.
- Replication lives in the **daemon** process and dies with it. App P2P storage
  belongs in the foreground with its own Corestore/Hyperswarm — don't try to
  reuse the daemon's.
- **A stall is usually the network, not the code**: `pear seed <link> --json`
  prints `firewalled`/`natType` (`natType: "Random"` = symmetric NAT, defeats
  holepunching). Test two bare Hyperswarm instances on a random topic before
  debugging app logic; use a local `hyperdht/testnet` for replication tests.

Fork surface (directly editable here — `App` passes its opts straight into
`PearRuntime`): updater opts `delay` (rollout-delay cap — distinct from
`--update-window`, which is App-level wait), `storage`, `bootstrap` (local DHT),
`bundled`; the `update-scheduled` and `updating-progress` events are available
but unwired; `updater.next` = staged path for custom install logic. See the
`pear-runtime` / `pear-runtime-updater` READMEs.
