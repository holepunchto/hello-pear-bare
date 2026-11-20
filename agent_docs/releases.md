# Standalone builds and releases

> Read when changing `scripts/make.js`, the package identity, signing or CI.
> [Agent guide](../AGENTS.md)

## Build outputs

- `npm run make` selects the current host (or `HOST`) and writes to `out/make/`.
  `make:<platform>-<arch>` scripts call `bare-build` directly and write to
  `out/<platform>-<arch>/`. Both paths support `darwin`, `linux` and `win32` on
  `arm64` and `x64`.
- Signing runs through `scripts/make.js`. On macOS, `MAC_CODESIGN_IDENTITY`
  enables hardened-runtime signing and `KEYCHAIN_PROFILE` enables notarization.
  On Windows, `WINDOWS_CERT_SHA1` selects the signing certificate and the script
  locates `signtool.exe` in the Windows SDK. The direct target scripts build unsigned.
- On a macOS or Linux host, smoke-test the current build with
  `./out/make/hello-pear-bare --no-updates --storage ./out/smoke`.
  On Windows use `out\make\hello-pear-bare.exe` with the same flags.
  With a valid link embedded, check for `Hello from worker`, then press Ctrl+C.

## CI and the deployment directory

[`ci.yaml`](../.github/workflows/ci.yaml) lints pushes and PRs to `main`, and
builds and runs the placeholder test on all six hosts. The test never launches
the built executable.

[`build.yaml`](../.github/workflows/build.yaml) is manually dispatched. Its
matrix uses `make-pear-app` in the `release` environment and uploads a standalone
per host. The packaging job restores executable bits for macOS and Linux, feeds
one binary per host plus the root `package.json` to `pear-build@1.1.1`, then
uploads `by-arch.tar.gz` as the `by-arch` artifact.

When changing the executable name, check the built filename against the name
`bin.mjs` passes to the worker (`productName || name`, plus `.exe` on Windows).
The archive contains the deployment directory's contents at its root. Use the
[README deployment guide](../README.md#peer-to-peer-deployments) for the release steps.
