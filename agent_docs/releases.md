# Builds & releases

> Read before touching `scripts/make.js`, the `make:*` scripts, or `.github/`,
> or when renaming the app or cutting/troubleshooting a release. Only non-obvious, code-verified facts —
> the code is the reference for everything else. Index: [AGENTS.md](../AGENTS.md).

- Local: `npm run make` (a **Node** script, `scripts/make.js`) picks the host
  target and runs `bare-build --standalone` → a self-contained executable in
  `out/<platform-arch>/`; other targets are per-host scripts
  (`make:<platform>-<arch>`) run on matching machines.
- CI: `.github/workflows/ci.yaml` lints, builds and tests on all six hosts on
  every push/PR to `main`. `.github/workflows/build.yaml` (manual dispatch) builds
  all six targets and assembles the complete by-arch Deployment Directory with
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
- Renaming the app is one chain: `--name` in all six `make:*` scripts, the
  hardcoded `hello-pear-bare` paths in `build.yaml` (artifact path, chmod, six
  `pear-build` flags), and `pkg.name` (the updater's by-arch lookup) must all
  change together.
- Staging works from anywhere; **serving does not**. `pear stage`/`provision` are
  local hypercore writes and succeed even when no peer can reach the machine —
  the seeder then reports `firewalled: true` with `upload.totalBytes: 0` forever
  and nobody receives the release. Seed from a host with a public address or cone
  NAT.
- No `pear.json` — production multisig is optional/external; the ceremony
  gotchas (≥3 seeding machines, tty-only passphrase prompts) are documented in
  hello-pear-electron's `agent_docs/releases.md` (in that repo).
