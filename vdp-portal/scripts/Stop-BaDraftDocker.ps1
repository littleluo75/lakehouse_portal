<#
WP-006D: stops the BA Draft Docker LAN stack without removing containers,
networks, or volumes (so `docker compose ... restart` / re-running
Start-BaDraftDocker.ps1 keeps working). Run from vdp-portal:

    .\scripts\Stop-BaDraftDocker.ps1
#>

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$ComposeProject = 'vdcp-ba-draft'
$ComposeFile = 'compose.ba-draft.yaml'

function Get-BaDraftLanIP {
    $excludeAliasPattern = 'vEthernet|Loopback|WSL|Hyper-V|Tailscale|NetBird|WireGuard|ZeroTier|TAP-|VPN|^wt[0-9]*$|Npcap'
    $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike '127.*' -and
            $_.IPAddress -notlike '169.254.*' -and
            $_.InterfaceAlias -notmatch $excludeAliasPattern
        }
    foreach ($candidate in $candidates) {
        $netProfile = Get-NetConnectionProfile -InterfaceAlias $candidate.InterfaceAlias -ErrorAction SilentlyContinue
        if (-not $netProfile) { continue }
        if ($netProfile.NetworkCategory -notin @('Private', 'DomainAuthenticated')) { continue }
        if ($netProfile.IPv4Connectivity -eq 'Disconnected') { continue }
        return $candidate.IPAddress
    }
    return $null
}

# Only needed so compose can interpolate ${BA_DRAFT_LAN_IP} while parsing the
# file; stopping already-created containers does not change port bindings.
$env:BA_DRAFT_LAN_IP = Get-BaDraftLanIP
if (-not $env:BA_DRAFT_LAN_IP) { $env:BA_DRAFT_LAN_IP = '127.0.0.1' }

docker compose -p $ComposeProject -f $ComposeFile stop
if ($LASTEXITCODE -ne 0) { Write-Error 'Failed to stop the BA Draft stack.'; exit 1 }

Write-Output 'BA Draft stack stopped (containers, networks and volumes preserved).'
