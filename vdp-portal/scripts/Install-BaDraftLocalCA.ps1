<#
WP-006D: extracts Caddy's internal-CA root certificate (public cert only,
never a private key) from the vdcp-ba-draft-caddy-data volume and trusts it
in the current Windows user's Cert:\CurrentUser\Root store. Safe to re-run;
skips import if the thumbprint is already trusted. Run from vdp-portal:

    .\scripts\Install-BaDraftLocalCA.ps1
#>

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$VolumeName = 'vdcp-ba-draft-caddy-data'
$CertOutPath = Join-Path $repoRoot 'docs\ba-draft-caddy-root-ca.crt'

$volumeExists = docker volume inspect $VolumeName 2>$null
if (-not $volumeExists -or $LASTEXITCODE -ne 0) {
    Write-Warning "Volume '$VolumeName' not found. Start the stack first (Start-BaDraftDocker.ps1) so Caddy creates its internal CA."
    exit 1
}

Write-Output 'Extracting Caddy internal root CA certificate from the data volume...'
$certPemLines = docker run --rm -v "${VolumeName}:/data:ro" alpine:3.20 cat /data/caddy/pki/authorities/local/root.crt 2>$null
$certPem = ($certPemLines -join "`n")
if (-not $certPem -or $certPem -notmatch 'BEGIN CERTIFICATE') {
    Write-Warning 'Could not read the Caddy internal root CA yet. It is created on first TLS handshake — hit https://localhost/ once, then re-run this script.'
    exit 1
}

New-Item -ItemType Directory -Force -Path (Split-Path $CertOutPath) | Out-Null
$certPem | Out-File -FilePath $CertOutPath -Encoding ascii -NoNewline

$newCert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($CertOutPath)
$thumbprint = $newCert.Thumbprint
Write-Output "Root CA subject: $($newCert.Subject)"
Write-Output "Root CA thumbprint: $thumbprint"

$existing = Get-ChildItem Cert:\CurrentUser\Root | Where-Object { $_.Thumbprint -eq $thumbprint }
if ($existing) {
    Write-Output 'Root CA is already trusted in Cert:\CurrentUser\Root (no duplicate import).'
}
else {
    Import-Certificate -FilePath $CertOutPath -CertStoreLocation Cert:\CurrentUser\Root | Out-Null
    Write-Output 'Root CA imported into Cert:\CurrentUser\Root.'
}

Write-Output ''
Write-Output "Public root certificate for BA devices: $CertOutPath"
Write-Output "Removal command (this device): Get-ChildItem Cert:\CurrentUser\Root | Where-Object Thumbprint -eq '$thumbprint' | Remove-Item"
