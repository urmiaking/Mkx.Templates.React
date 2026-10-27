param([string]$Subject='mailto:admin@example.com',[switch]$Force)
$ErrorActionPreference='Stop'
if(-not($Subject.StartsWith('mailto:') -or $Subject.StartsWith('https://'))){throw 'Subject must be mailto: or HTTPS'}
$target=Join-Path $PSScriptRoot '../src/Server/Mkx.Templates.Server/appsettings.Push.local.json'
if((Test-Path $target) -and -not $Force){Write-Output 'Existing VAPID keys preserved. Use -Force only to rotate keys.';exit 0}
function Base64Url([byte[]]$bytes){[Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')}
$key=[System.Security.Cryptography.ECDsa]::Create([System.Security.Cryptography.ECCurve]::CreateFromFriendlyName('nistP256'))
try {
  $p=$key.ExportParameters($true)
  $public=[byte[]]::new(65);$public[0]=4
  [Array]::Copy($p.Q.X,0,$public,1,32);[Array]::Copy($p.Q.Y,0,$public,33,32)
  @{Push=@{Enabled=$true;Subject=$Subject;PublicKey=(Base64Url $public);PrivateKey=(Base64Url $p.D)}} |
    ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $target -Encoding utf8
  Write-Output 'Unique VAPID keys written to ignored appsettings.Push.local.json.'
} finally {$key.Dispose()}
