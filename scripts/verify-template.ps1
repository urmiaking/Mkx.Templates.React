param([string] $Configuration = 'Release')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('mkx-react-template-' + [guid]::NewGuid().ToString('N'))
$packages = Join-Path $tmp 'packages'
$hive = Join-Path $tmp 'hive'
$generated = Join-Path $tmp 'Acme.Workspace'
New-Item -ItemType Directory -Path $packages -Force | Out-Null
Push-Location $root
try {
  & ./template-content/scripts/verify.ps1 -Configuration $Configuration
  if (-not $?) { throw 'Source verification failed' }
  dotnet pack Mkx.Templates.React.csproj -c $Configuration -o $packages
  if ($LASTEXITCODE -ne 0) { throw 'NuGet packing failed' }
  $package = Get-ChildItem $packages -Filter '*.nupkg' | Select-Object -First 1
  if ($null -eq $package) { throw 'No package generated' }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($package.FullName)
  try {
    $names = @($zip.Entries | ForEach-Object FullName)
    foreach ($needed in @('content/.template.config/template.json','content/AGENTS.md','content/src/Client/package-lock.json','content/src/Client/src/main.tsx','content/Mkx.Templates.slnx')) {
      if ($needed -notin $names) { throw "Missing NuGet content: $needed" }
    }
    $forbidden = $names | Where-Object { $_ -match '/(bin|obj|node_modules|dist|TestResults|coverage|\.git|\.vs)/|/(app.db|\.env|.*\.pfx)$' }
    if ($forbidden) { throw "Leaked generated files: $($forbidden -join ', ')" }
  } finally { $zip.Dispose() }
  dotnet new install $package.FullName --debug:custom-hive $hive
  if ($LASTEXITCODE -ne 0) { throw 'Template install failed' }
  dotnet new mkx-react -n Acme.Workspace -o $generated --debug:custom-hive $hive --no-update-check
  if ($LASTEXITCODE -ne 0) { throw 'Template creation failed' }
  if (!(Test-Path "$generated/src/Server/Acme.Workspace.Server/Acme.Workspace.Server.csproj")) { throw 'SourceName replacement failed' }
  if (!(Test-Path "$generated/src/Client/package-lock.json")) { throw 'Generated lockfile missing' }
  Push-Location $generated
  try {
    & ./scripts/verify.ps1 -Configuration $Configuration
    if (-not $?) { throw 'Generated verification failed' }
  } finally { Pop-Location }
  Write-Host "Template install and generated verification passed. Package: $($package.FullName); generated: $generated"
} finally { Pop-Location }
