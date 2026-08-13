# Builds & releases

> Read before touching `scripts/make.js`, the `make:*` scripts, or `.github/`,
> or when renaming the app or cutting/troubleshooting a release. Only
> non-obvious, verified facts — the code and referenced deployment tooling are
> the reference for everything else. Index: [AGENTS.md](../AGENTS.md).

- Local: `npm run make` (a **Node** script, `scripts/make.js`) picks the host
  target and runs `bare-build --standalone` → a self-contained executable in
  `out/<platform-arch>/`; `make:<platform>-<arch>` builds an explicit target. CI
  selects each target on a matching host, then runs the branch's tests there.
- CI: `.github/workflows/ci.yaml` lints once, then builds and tests on all six
  hosts on pushes to `main` and pull requests targeting `main`.
  `.github/workflows/build.yaml` (manual dispatch) builds all six targets and
  assembles the complete by-arch Deployment Directory with
  `npx pear-build@1.1.1 --target deployment`, uploaded as a `by-arch.tar.gz`
  artifact — use it instead of hand-building the deployment directory.
- Deployment drive layout is `by-arch/<platform-arch>/app/<name>` (`<name>.exe` on
  Windows). From staging onward follow hello-pear-electron's README ("5. Stage"
  and later); end users install with `npx pear-install pear://<key>`.
- Update apply swaps the installed binary: on macOS/Linux `fsx.swap` atomically
  exchanges the two directory entries — the running process keeps its original
  inode, which is why swapping while running is safe. Windows uses copy+rename
  (keeps `<name>-<oldVersion>.exe` beside it). Rollback = stage a **higher**
  version; the updater has no downgrade path.
- The foreground launch that spawned the daemon keeps its current version. A
  subsequent launch after the apply completes uses the updated binary, so a user
  may need two runs to see a new version. `updates.log` records what the daemon
  did.
- Renaming the app is one chain: `--name` in all six `make:*` scripts, the
  hardcoded `hello-pear-bare` paths in `build.yaml` (artifact path, chmod, six
  `pear-build` flags), and `appName` (`pkg.productName || pkg.name`, used for the
  updater's by-arch lookup) must all change together.
- Staging and provisioning are local writes, so success does not prove peers can
  receive the release. Confirm the seeder gains peers and uploads data; if it
  remains at zero peers and `upload.totalBytes: 0`, seed from a better-connected
  host.
- No `pear.json` is committed; any multisig configuration and ceremony are
  outside this template. The ceremony gotchas (≥3 seeding machines, tty-only
  passphrase prompts) are documented in hello-pear-electron's
  `agent_docs/releases.md` (in that repo).
