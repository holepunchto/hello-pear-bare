# CLI and worker architecture

> Read when changing `bin.mjs`, `app.js` or `workers/main.js`, or when the CLI starts
> without a worker greeting. [Agent guide](../AGENTS.md)

Under Bare, `PearRuntime.run(require.resolve('./workers/main.js'), args)` starts
a `bare-worker` thread and returns only its IPC stream. The CLI owns that lifetime.
Closing `App` destroys the framed stream and IPC. The runtime then terminates the
worker, which exits at once. The worker's `graceful-goodbye` cleanup does not
finish, so don't rely on worker-side work at shutdown.

The parent holds only IPC and never sees the worker's `error` or `exit` events. An
uncaught error in the worker, such as `INVALID_URL` from the placeholder link,
aborts the whole process without `[app:error]`. A worker that exits on its own
only ends IPC, and the CLI exits 0 without a message. The `exit` handler in
`app.js` never fires.

## Startup and IPC

- `bin.mjs` identifies a source run by the executable basename (`bare` or
  `bare.exe`). It skips the executable and script in source argv, and only the
  executable in a standalone. Register CLI options with `paparam` in this file.
  `--no-updates` also accepts `--updates`, and the last of the two wins.
- The argument order is `[String(updates), version, upgrade, name, dir, app || '']`.
  The worker skips two argv entries on desktop and zero under BareKit. Only the
  literal string `'false'` disables updates. A source run sends an empty final
  argument, so the updater is not bundled and never checks, downloads or applies
  an update. With `--updates` it only joins the swarm.
- Default storage is `<tmpdir>/pear/<appName>` in development, shared by every
  checkout, and `<persistent()>/<appName>` in a standalone
  (`~/Library/Application Support/<appName>` on macOS). `--storage <dir>` overrides
  both, and a relative path resolves against the working directory. The worker
  opens its Corestore under `<dir>/pear-runtime/corestore`. A standalone stages
  updates under `<dir>/pear-runtime/next/`.
- `App.ready()` finishes once the parent has wired its streams. The worker sends
  `Hello from worker` after constructing the updater, which parses the link, and
  installing its handlers. Neither step waits for storage or a peer. Storage open
  errors are discarded, so the greeting proves the link parsed, not that the
  Corestore opened.
- Frames are whole strings. `App._onmessage()` turns `updating`, `updated` and
  `pear:updateApplied` into events and emits every other frame as `message`, which
  `bin.mjs` prints. Serialise structured data into the frame, for example
  `'name ' + JSON.stringify(value)`. The worker answers any parent frame other than
  `pear:applyUpdate` with `unknown-message <frame>`. The
  [frame table](updates.md#what-the-cli-reports) lists the current frames.

## Refreshing the shared worker

The CLI loads the committed `workers/main.js`. To take an upstream change, run
`npm install -D hello-pear-worker@<version>`, then `npm run inline-worker`. Always
run the inliner through npm, which provides its environment and the local `bare`.

The inliner (`inline-worker-module`) copies the worker's entry file and runs
`npm install --save-prod <dep>@<range>` for each worker dependency. npm saves the
newest matching version, so a refresh can upgrade runtime dependencies such as
`pear-runtime` even when the worker version is unchanged. It never removes
dependencies the worker dropped. It adds only the worker `imports` entries that the
app lacks, so apply upstream changes to existing entries by hand. A normal install
uses the existing copy.

After a refresh, review `workers/main.js`, `package.json` and `package-lock.json`
together. Check the worker's argv reads and frames against `app.js`, run
`npm run lint`, and look for `Hello from worker` from source and in the host
standalone.

The first line of the worker records its upstream URL and version. While that line
starts with `// https://github.com/holepunchto/hello-pear-worker v`, whatever the
version, a refresh overwrites the file, including hand edits. To fork the worker
locally, delete the header line and the blank line after it. A leftover leading
blank line fails Prettier. The inliner then refuses to overwrite the file, and
`npm run inline-worker` exits 1 before installing anything. Merge upstream changes
by hand from `node_modules/hello-pear-worker/index.js`. To return to upstream,
delete `workers/main.js` and rerun the refresh.
