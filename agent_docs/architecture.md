# CLI and worker architecture

> Read when changing `bin.mjs`, `app.js` or `workers/main.js`, or when the CLI starts
> without a worker greeting. [Agent guide](../AGENTS.md)

Under Bare, `PearRuntime.run(require.resolve('./workers/main.js'), args)` starts
a `bare-worker` thread and returns its IPC stream. The CLI owns that lifetime.
Closing `App` destroys the framed stream and IPC. The runtime terminates the worker
when IPC closes.

## Startup and IPC

- `bin.mjs` identifies a source run by the executable basename (`bare` or
  `bare.exe`). It skips the executable and script in source argv, and only the
  executable in a standalone. Register CLI options with `paparam` in this file.
- The argument order is `[String(updates), version, upgrade, name, dir, app || '']`.
  The worker skips two argv entries on desktop and zero under BareKit. Only the
  literal string `'false'` disables updates. An empty final argument means the
  development runtime has no executable to replace.
- Default storage is `<tmpdir>/pear/<appName>` in development and
  `<persistent()>/<appName>` in a standalone. `--storage <dir>` overrides both.
  The worker opens its Corestore under `<dir>/pear-runtime/corestore`.
- `App.ready()` finishes once the parent has wired its streams. The worker sends
  `Hello from worker` after installing its handlers. Neither step waits for a peer.

## Refreshing the shared worker

The CLI loads the committed `workers/main.js`. To take an upstream change, update
the `hello-pear-worker` dev dependency and run `npm run inline-worker`. The inliner
copies its entrypoint, installs its production dependencies and merges its import
mappings with the app's mappings. Review the worker, `package.json` and
`package-lock.json` together. A normal install uses the existing copy.

The first line of the worker records its upstream URL and version. A matching
source header allows a refresh to overwrite the file, including hand edits.
Remove the header when forking the worker locally so the inliner refuses to overwrite it.
