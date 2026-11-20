# OTA updates

> Read when changing update handling or diagnosing a release that fails to reach
> the CLI. [Agent guide](../AGENTS.md)

## Discovery and timing

With updates enabled, the worker replicates Corestore connections and joins the
update drive's discovery key as a client only. A peer must seed the drive. In the
locked `pear-runtime-updater` 3.4.0, automatic checks and apply require a bundled
app, which means a standalone that passes its executable path. A source run with
`--updates` exercises only the connection. After `Hello from worker` it prints
nothing for a connection, an append or a newer version, so confirm the connection
on the seeding side. Use the host standalone to exercise a download and executable
replacement.

Each running CLI needs its own storage. A second process on the same directory
cannot lock the Corestore (`File descriptor could not be locked`). The updater
discards that error, so no check runs and nothing is reported. When a peer
connects, the process aborts with `Corestore is closed`.

On startup the standalone checks the drive length its storage already knows,
without waiting for peers. With fresh storage that check finds nothing, and the
release arrives through the first sync with a seeder. Every append to the drive,
including that first sync, cancels the pending check and schedules a new one.
Within 60 seconds of start the check runs immediately. After that it waits a delay
drawn once per updater, up to one hour, so frequent appends keep pushing it back.
The worker forwards `update-scheduled <ms>` with that sampled delay on every
append, including during the first minute. The frame alone does not mean a new
release.

The worker looks for seeders when it joins and then every 10 to 12 minutes. Start
the seeder before the CLI. If a release arrives after the first minute, restart the
CLI with the same storage for an immediate check.

## Versions and payloads

The updater compares the drive-root `package.json#version` with the running version
as semver. A pre-release sorts below its release, so `0.0.0-rc.0` is older than
`0.0.0`. It stages a strictly newer version by mirroring
`/by-arch/<platform>-<arch>/app/<name>` into `<dir>/pear-runtime/next/<length>.<fork>/`
with its drive path intact, so the staged file is
`<dir>/pear-runtime/next/<length>.<fork>/by-arch/<platform>-<arch>/app/<name>`.
If this host's path is missing, the CLI prints `updater-error update not found`. A
missing `package.json` or a version that is not newer ends the check silently. An
equal version prefetches the payload's blocks without staging it.

On macOS and Linux, applying swaps the staged file with the running executable
(`os.execPath()`) and deletes the staging directory. The storage directory and the
executable must be on the same filesystem, and the executable's directory must be
writable. Otherwise the CLI prints `pear:updateFailed <reason>`. The swap keeps the
staged file's mode, so the drive entry needs its executable bit. Without it the CLI
still reports the update as applied, and the new binary fails with
`permission denied`. On Windows the updater renames the running `.exe` to
`<base>-<oldVersion>.exe`, leaves it there and moves the new copy into place.
Running `./out/make/hello-pear-bare` with updates enabled replaces that build output.

The running version is the one embedded in the binary. To deliver an earlier
implementation as a rollback, rebuild it with a higher `package.json#version` and
stage that build. An old build staged under a higher drive version still reports
its old version, so every start stages it again from local storage and applies it
again, even with no seeder online.

## Testing an update locally

1. Write a seeder script outside the app that creates a throwaway Hyperdrive and
   joins its discovery key as a Hyperswarm server. Only one process can open a
   Corestore directory, so the seeder must also make the later writes.
2. Set `package.json#upgrade` to `'pear://' + hid.encode(drive.key)`
   (`hypercore-id-encoding`), run `npm run make` and copy `out/make/<name>` elsewhere
   as the installed binary.
3. Raise `package.json#version`, build again and have the seeder write the new build
   to `/by-arch/<platform>-<arch>/app/<name>` with `{ executable: true }`, plus
   `/package.json` with the new version.
4. Start the seeder first, then run the installed copy with `--storage ./out/e2e`.
   Expect the three `[updater]` lines from the table below. A rerun prints the new
   version.

Never seed the app's real link, and restore `upgrade` and `version` before committing.

## What the CLI reports

| Worker frame                                                                                                                                             | Parent behavior                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `updating`                                                                                                                                               | Emits `updating` once a newer payload is found, before it is copied. The CLI prints `[updater] getting new update`. |
| `updated`                                                                                                                                                | Emits `updated` and immediately sends `pear:applyUpdate`. The CLI prints `[updater] update complete... applying`.   |
| `pear:updateApplied`                                                                                                                                     | Emits `update-applied`. The CLI prints `[updater] applied update, restart to run latest version`.                   |
| Any other frame: `Hello from worker`, `update-scheduled <ms>`, `updater-error …`, `pear:updateFailed …`, `unknown-message …`, `minver-required` (mobile) | Emits `message`. The CLI prints the frame as received.                                                              |

`applyUpdate()` acts at most once per process, even when that attempt fails. The
worker sends `pear:updateApplied` whenever the call resolves. While the drive's
version stays above the version the process started with, each later append
downloads the payload again. The CLI then reports the update as applied without
replacing anything. Restart the CLI to run the new executable or to retry a failed
apply. On startup a standalone clears `<dir>/pear-runtime/next` and checks again.

`bin.mjs` listens for `updating-delta`, but `App` never emits it. The worker forwards
neither `updating-delta` nor `updating-progress`. Showing download progress means
forking the worker (see
[Refreshing the shared worker](architecture.md#refreshing-the-shared-worker)). The
fork forwards the updater events as string frames, such as
`'updating-progress ' + JSON.stringify(stats)`, and `App._onmessage()` decodes them.
`updating-progress` fires about every 250 ms with
`{ peers, download: { bytes, blocks, speed, progress }, upload }`. `updating-delta`
is a per-file diff, `{ op, key, bytesRemoved, bytesAdded }`, sent before each
changed file is copied. For this template it fires once, and `bytesAdded` is the
payload size. `download.progress` is estimated only for files stored with a block
map and otherwise stays 0. `download.bytes` excludes blocks already stored locally.
Compute a percentage from `download.bytes` and `bytesAdded`, and treat `updated` as
complete.
