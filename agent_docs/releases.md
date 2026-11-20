# Standalone builds and releases

> Read when changing `scripts/make.js`, the package identity, signing or CI.
> [Agent guide](../AGENTS.md)

## Build outputs

- `npm run make` selects the current host (or `HOST`) and writes to `out/make/`.
  `make:<platform>-<arch>` scripts call `bare-build` directly and write to
  `out/<platform>-<arch>/`. Both paths support `darwin`, `linux` and `win32` on
  `arm64` and `x64`, and any host can produce any target. Only a macOS host
  re-signs darwin output. A darwin binary built elsewhere has an invalid signature,
  and macOS kills it at launch until it is signed on a Mac. `out/make/` is not
  cleaned, so a `HOST=linux-x64` build replaces the macOS binary of the same name.
  Use the `make:<platform>-<arch>` scripts for cross-builds.
- To add or drop a target, change the supported set and its error message in
  `scripts/make.js`, the `make:` script in `package.json`, both workflow matrices
  and the `--<platform>-<arch>-app` flags in `build.yaml`.
- Signing runs through `scripts/make.js`, which reads its variables on any host and
  for any target. `MAC_CODESIGN_IDENTITY` enables hardened-runtime signing. Use it
  only for darwin targets, because a `win32` target then calls `signtool`.
  `KEYCHAIN_PROFILE` zips `out/make/<name>` and runs `xcrun notarytool submit --wait`
  whether or not the binary is signed, so set both. The script checks only
  notarytool's exit code, so confirm `status: Accepted` in the output.
  `WINDOWS_CERT_SHA1` selects the signing certificate, and the script puts the
  newest `signtool.exe` from `C:\Program Files (x86)\Windows Kits\10\bin` first on
  `PATH`. In standalone mode `bare-build` 1.6.0 signs only the embedded native
  addons, so the `.exe` itself ships without an Authenticode signature. The direct
  target scripts pass no signing flags. On a macOS host,
  `bare-build` still gives darwin outputs an ad-hoc signature.
- On a macOS or Linux host, smoke-test the current build with
  `./out/make/hello-pear-bare --no-updates --storage ./out/smoke`.
  On Windows use `out\make\hello-pear-bare.exe` with the same flags.
  The build embeds `package.json`, so set a valid `upgrade` link before building.
  Check for `Hello from worker`, then press Ctrl+C. The CLI exits with code 130.
  On macOS the first launch of a new build can print nothing for 10 to 20 seconds.
  Linux builds need glibc 2.34 or later and a libstdc++ with `GLIBCXX_3.4.30`
  (GCC 12), whatever host built them. Ubuntu 22.04 and Debian 12 qualify, while
  RHEL 9 and its rebuilds do not.

## CI and the deployment directory

[`ci.yaml`](../.github/workflows/ci.yaml) lints pushes and PRs to `main`, and
builds and runs the placeholder test on all six hosts. The test never launches
the built executable.

[`build.yaml`](../.github/workflows/build.yaml) is manually dispatched. Each matrix
leg runs `holepunchto/actions/make-pear-app@v1` in the `release` environment. The
action runs `npm run make` with `HOST` and the signing variables set, and uploads
the standalone from `out/make/` as an artifact named after the host. Keep that
script name, the `out/make/` path and the signing variable names stable. `@v1` is a
moving tag. Check the workflow's `with:` inputs against the action's `action.yml`,
because a macOS or Windows leg without certificate inputs fails. The packaging job
runs only when all six legs pass. It restores executable bits for macOS and Linux,
feeds one binary per host plus the root `package.json` to `pear-build@1.1.1`, then
uploads `by-arch.tar.gz` as the `by-arch` artifact.

The executable name comes from `productName || name` in `package.json`.
`bare-build` writes it lowercased and hyphenated, so `HelloPear` becomes
`hello-pear`. `bin.mjs` passes the raw value to the worker, `scripts/make.js`
notarizes `out/make/<raw value>`, and `pear-build` fails unless each file's
basename equals that value. Keep the name lowercase and hyphenated, and confirm
that `ls out/make` shows exactly that name (plus `.exe` on Windows). The archive
holds `package.json` and `by-arch/<platform>-<arch>/app/<name>` at its root. Use the
[README deployment guide](../README.md#peer-to-peer-deployments) for the release steps.
