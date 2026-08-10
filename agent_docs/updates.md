# OTA update behavior

> Read before touching the update flow or adding P2P data, or when debugging
> how OTA updates land. Only non-obvious, code-verified facts —
> the code is the reference for everything else. Index: [AGENTS.md](../AGENTS.md).

Flow: stage a new build (README) → `App`'s swarm replicates the drive, the updater
mirrors the bundle → `updated` triggers `_applyUpdate()` → the installed binary is
swapped for the **next** launch.

Timing (bundled launches only — dev never checks):

- Immediate check at every launch; after a drive append, a check on a randomized
  delay (drawn once per process, ≤1 h by default; appends within 60 s of boot
  check immediately; each new append reschedules the pending check). A
  long-running CLI can take up to an hour to react to a staging.
- Only strictly-newer semver wins — rollback = stage a **higher** version (see
  `releases.md`).

Apply:

- `_applyUpdate()` wraps `pear.updater.applyUpdate()` in try/catch and emits
  `error` on failure. No retry is possible: the updater latches `applied = true`
  before swapping.
- Dev (`--updates`): replication only — `app` is `null`, so the updater is not
  bundled and neither downloads nor applies. The real flow needs a standalone
  build.

Replication / seeding:

- The app joins the drive client-only and never seeds — run dedicated
  `pear seed`ers.
- **Everything update-related is gated behind `updates !== false`**, including
  `swarm.on('connection', (c) => store.replicate(c))` and the drive join. When
  adding app P2P storage, hoist the replicate handler out of the gate and
  `swarm.join` your app topic separately — only the updater-drive join stays
  gated. Under the dev default `--no-updates`, nothing replicates at all.
- **A stall is usually the network, not the code**: `pear seed <link> --json`
  prints `firewalled`/`natType` (`natType: "Random"` = symmetric NAT, defeats
  holepunching). Test two bare Hyperswarm instances on a random topic before
  debugging app logic; use a local `hyperdht/testnet` for replication tests.

Fork surface (directly editable here — `App` passes its opts straight into
`PearRuntime`): updater opts `delay` (rollout-delay cap; `0` = instant, good for
tests), `storage`, `bootstrap` (local DHT), `bundled`; events `update-scheduled`
and `updating-progress` (progress-bar stats) are available but unwired
(`updating-delta` and `error` are already wired); `updater.next` = staged path for
custom install logic. See the `pear-runtime` / `pear-runtime-updater` READMEs.
