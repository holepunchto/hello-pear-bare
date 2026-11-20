# OTA updates

> Read when changing update handling or diagnosing a release that fails to reach
> the CLI. [Agent guide](../AGENTS.md)

## Discovery and timing

With updates enabled, the worker replicates Corestore connections and joins the
update drive's discovery key as a client. A peer must seed the drive. Running
from source with `--updates` exercises this connection path. In the locked
`pear-runtime-updater` 3.4.0, automatic checks and apply require a bundled app.
Use the host standalone to exercise a download and executable replacement.

The standalone checks on startup. A drive append in the first minute schedules
an immediate check. Later appends replace the pending timer with a delay drawn
once per updater, up to one hour. The worker forwards `update-scheduled <ms>`
with that sampled delay, including during the first minute.

The updater compares the drive-root `package.json#version` with the running
version. It stages a strictly newer version from
`/by-arch/<platform>-<arch>/app/<name>`. An equal version can prefetch blocks.
To deliver an earlier implementation as a rollback, give it a higher version.

## What the CLI reports

| Worker frame                                                   | Parent behavior                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------ |
| `updating`                                                     | Emits `updating` when the payload download starts.                 |
| `updated`                                                      | Emits `updated` and immediately sends `pear:applyUpdate`.          |
| `pear:updateApplied`                                           | Emits `update-applied`. Restart the CLI to run the new executable. |
| `updater-error …`, `pear:updateFailed …`, `update-scheduled …` | Emits `message`. The CLI prints the frame as received.             |

The CLI has an `updating-delta` listener. To display download progress, add a
corresponding worker frame and decode it in `App._onmessage()`. Changes on the
CLI side alone cannot surface deltas from the worker.
