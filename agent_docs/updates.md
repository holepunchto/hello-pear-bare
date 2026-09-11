# OTA update behavior

> Read before touching the update flow or adding P2P data, or when debugging
> how OTA updates land. Only non-obvious, code-verified facts —
> the code is the reference for everything else. Index: [AGENTS.md](../AGENTS.md).

Flow: stage a new build (README) → the worker replicates the drive and mirrors the
bundle → pipe strings reach `App` → `App` auto-sends `pear:applyUpdate` → the
installed binary is swapped for the **next** launch.

Timing (bundled launches only — dev never checks):

- Immediate check at every launch; after a drive append, a check on a randomized
  delay (drawn once per process, ≤1 h by default; appends within 60 s of boot
  check immediately; each new append reschedules the pending check). A
  long-running CLI can take up to an hour to react to a staging.
- Only strictly-newer semver wins — rollback = stage a **higher** version (see
  `releases.md`).

Apply:

- A premature/no-op apply (nothing downloaded, not bundled) resolves silently and
  the worker still replies `pear:updateApplied` — `update-applied` can fire with
  nothing applied. A _throwing_ apply (swap error) becomes an unhandled rejection
  in the worker thread → an uncaught crash in the parent, not an `App` `error`.
- Dev (`--updates`): replication only — the `app` arg is `''`, so the updater is
  not bundled and neither downloads nor applies. The real flow needs a standalone
  build.

Replication / seeding:

- The app joins the drive client-only and never seeds — run dedicated
  `pear seed`ers.
- `store.replicate` is registered only when updates are enabled (inside
  `hello-pear-worker`). For app P2P data, copy the worker in-project (see
  `architecture.md`), hoist `swarm.on('connection', (c) => store.replicate(c))`
  out of the updates gate, and `swarm.join` your app topic separately.
- **A stall is usually the network, not the code**: `pear seed <link> --json`
  prints `firewalled`/`natType` (`natType: "Random"` = symmetric NAT, defeats
  holepunching). Test two bare Hyperswarm instances on a random topic before
  debugging app logic; use a local `hyperdht/testnet` for replication tests.

Fork surface (requires the worker copied in-project — `hello-pear-worker`
forwards only the three protocol strings): updater opts `delay` (rollout-delay
cap; `0` = instant, good for tests), `storage`, `bootstrap` (local DHT),
`bundled`; events `error`, `update-scheduled`, `updating-progress` (progress-bar
stats), `updating-delta`; `updater.next` = staged path for custom install logic.
See the `pear-runtime` / `pear-runtime-updater` READMEs.
