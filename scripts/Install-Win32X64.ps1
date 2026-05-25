param(
  [string] $InstallRoot
)

$ErrorActionPreference = 'Stop'

function Add-UserPath {
  param([string] $Path)

  $resolved = [System.IO.Path]::GetFullPath($Path)
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $entries = @()

  if (-not [string]::IsNullOrWhiteSpace($userPath)) {
    $entries = @($userPath -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  }

  $exists = $false
  foreach ($entry in $entries) {
    if ([string]::Equals(
        [System.IO.Path]::GetFullPath([Environment]::ExpandEnvironmentVariables($entry)),
        $resolved,
        [System.StringComparison]::OrdinalIgnoreCase
      )) {
      $exists = $true
      break
    }
  }

  if ($exists) {
    return $false
  }

  $next = if ($entries.Count -eq 0) { $resolved } else { ($entries + $resolved) -join ';' }
  [Environment]::SetEnvironmentVariable('Path', $next, 'User')
  return $true
}

$repo = Resolve-Path (Join-Path $PSScriptRoot '..')
$pkg = Get-Content -Raw -Path (Join-Path $repo 'package.json') | ConvertFrom-Json
$name = if ($pkg.productName) { $pkg.productName } else { $pkg.name }

if (-not $InstallRoot) {
  $InstallRoot = Join-Path $env:APPDATA $name
}

$src = Join-Path $repo "out\win32-x64\$name.exe"
$bin = Join-Path $InstallRoot 'bin'
$dest = Join-Path $bin "$name.exe"

if (-not (Test-Path -LiteralPath $src)) {
  throw "Missing build output: $src. Run 'npm run make:win32-x64' first."
}

New-Item -ItemType Directory -Force -Path $bin | Out-Null
Copy-Item -LiteralPath $src -Destination $dest -Force

$pathChanged = Add-UserPath -Path $bin

Write-Host "Installed $name to $dest"
if ($pathChanged) {
  Write-Host "Added $bin to the user PATH. Open a new terminal to run '$name.exe' by name."
} else {
  Write-Host "$bin is already on the user PATH."
}
