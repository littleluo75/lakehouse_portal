<#
WP-006D owner launcher: builds and starts the BA Draft Docker LAN HTTP/HTTPS
stack (Caddy edge + portal, compose project vdcp-ba-draft). Run from
vdp-portal:

    .\scripts\Start-BaDraftDocker.ps1

BA_DRAFT_LAN_IP is set only in this process's environment (never written to
a file) and passed to `docker compose` for interpolation into
compose.ba-draft.yaml.
#>

[CmdletBinding()]
param(
    [int]$HealthTimeoutSec = 180
)

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$ComposeProject = 'vdcp-ba-draft'
$ComposeFile = 'compose.ba-draft.yaml'
$FirewallRuleHttp = 'VDCP BA Draft HTTP 80 LAN'
$FirewallRuleHttps = 'VDCP BA Draft HTTPS 443 LAN'

function Test-IsElevated {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

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
        return [PSCustomObject]@{
            InterfaceAlias  = $candidate.InterfaceAlias
            IPAddress       = $candidate.IPAddress
            PrefixLength    = $candidate.PrefixLength
            NetworkCategory = $netProfile.NetworkCategory
        }
    }
    return $null
}

function Test-BaDraftFirewallRulesExist {
    $rule80 = Get-NetFirewallRule -DisplayName $FirewallRuleHttp -ErrorAction SilentlyContinue
    $rule443 = Get-NetFirewallRule -DisplayName $FirewallRuleHttps -ErrorAction SilentlyContinue
    return ($null -ne $rule80) -and ($null -ne $rule443)
}

function New-BaDraftFirewallRules {
    param([Parameter(Mandatory)][string]$LanIp)
    New-NetFirewallRule -DisplayName $FirewallRuleHttp -Direction Inbound -Action Allow `
        -Protocol TCP -LocalPort 80 -LocalAddress $LanIp -RemoteAddress LocalSubnet `
        -Profile Private,Domain -EdgeTraversalPolicy Block | Out-Null
    New-NetFirewallRule -DisplayName $FirewallRuleHttps -Direction Inbound -Action Allow `
        -Protocol TCP -LocalPort 443 -LocalAddress $LanIp -RemoteAddress LocalSubnet `
        -Profile Private,Domain -EdgeTraversalPolicy Block | Out-Null
}

function Wait-ContainerHealthy {
    param([Parameter(Mandatory)][string]$Name, [int]$TimeoutSec = 180)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        $status = docker inspect --format '{{.State.Health.Status}}' $Name 2>$null
        if ($status -eq 'healthy') { return $true }
        if ($LASTEXITCODE -ne 0) { return $false }
        Start-Sleep -Seconds 3
    }
    return $false
}

Write-Output '== Step 1/12: Detect trusted LAN IPv4 =='
$lan = Get-BaDraftLanIP
if (-not $lan) {
    Write-Error 'DOCKER_DEPLOYMENT_BLOCKED: no trusted (Private/DomainAuthenticated) LAN IPv4 found. Connect to the trusted LAN and re-run.'
    exit 1
}
Write-Output "Selected interface: $($lan.InterfaceAlias) -> $($lan.IPAddress)/$($lan.PrefixLength) [$($lan.NetworkCategory)]"

Write-Output '== Step 2/12: Validate ports 80/443 are free of unrelated processes =='
$conflicts = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in 80, 443 } |
    ForEach-Object {
        $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        [PSCustomObject]@{ LocalAddress = $_.LocalAddress; LocalPort = $_.LocalPort; Pid = $_.OwningProcess; ProcessName = $proc.ProcessName }
    }
if ($conflicts) {
    $conflicts | Format-Table -AutoSize | Out-String | Write-Output
    Write-Error 'DOCKER_DEPLOYMENT_BLOCKED: ports 80/443 are already bound by a process outside this stack. Stop only the owning process if it belongs to a prior BA Draft run, then re-run this script.'
    exit 1
}
Write-Output 'Ports 80 and 443 are free.'

Write-Output '== Step 3/12: Validate Windows network profile =='
if ($lan.NetworkCategory -eq 'Public') {
    Write-Error "DOCKER_DEPLOYMENT_BLOCKED: interface '$($lan.InterfaceAlias)' is on the Public profile. Owner action: Set-NetConnectionProfile -InterfaceAlias '$($lan.InterfaceAlias)' -NetworkCategory Private (run elevated), then re-run this script."
    exit 1
}
Write-Output "Network profile OK: $($lan.NetworkCategory)"

Write-Output '== Step 4/12: Ensure Windows Firewall rules exist =='
if (Test-BaDraftFirewallRulesExist) {
    Write-Output 'Firewall rules already present.'
}
elseif (Test-IsElevated) {
    New-BaDraftFirewallRules -LanIp $lan.IPAddress
    Write-Output 'Firewall rules created.'
}
else {
    Write-Output ''
    Write-Output 'DOCKER_DEPLOYMENT_BLOCKED: firewall rules are missing and this session is not elevated.'
    Write-Output 'Open an elevated PowerShell window and run:'
    Write-Output ''
    Write-Output "New-NetFirewallRule -DisplayName '$FirewallRuleHttp' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80 -LocalAddress $($lan.IPAddress) -RemoteAddress LocalSubnet -Profile Private,Domain -EdgeTraversalPolicy Block"
    Write-Output "New-NetFirewallRule -DisplayName '$FirewallRuleHttps' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 443 -LocalAddress $($lan.IPAddress) -RemoteAddress LocalSubnet -Profile Private,Domain -EdgeTraversalPolicy Block"
    Write-Output ''
    Write-Output 'Then re-run this script.'
    exit 1
}

Write-Output '== Step 5/12: Set process-scoped BA_DRAFT_LAN_IP =='
$env:BA_DRAFT_LAN_IP = $lan.IPAddress
Write-Output "BA_DRAFT_LAN_IP=$($env:BA_DRAFT_LAN_IP) (process-scoped only)"

Write-Output '== Step 6/12: Validate Compose file =='
docker compose -p $ComposeProject -f $ComposeFile config -q
if ($LASTEXITCODE -ne 0) { Write-Error 'DOCKER_DEPLOYMENT_BLOCKED: compose.ba-draft.yaml failed validation.'; exit 1 }
Write-Output 'Compose file valid.'

Write-Output '== Step 7/12: Build images =='
docker compose -p $ComposeProject -f $ComposeFile build
if ($LASTEXITCODE -ne 0) { Write-Error 'DOCKER_DEPLOYMENT_BLOCKED: image build failed.'; exit 1 }

Write-Output '== Step 8/12: Start stack =='
docker compose -p $ComposeProject -f $ComposeFile up -d
if ($LASTEXITCODE -ne 0) { Write-Error 'DOCKER_DEPLOYMENT_BLOCKED: docker compose up failed.'; exit 1 }

Write-Output '== Step 9/12: Wait for container health =='
$portalHealthy = Wait-ContainerHealthy -Name 'vdcp-ba-draft-portal' -TimeoutSec $HealthTimeoutSec
$edgeHealthy = Wait-ContainerHealthy -Name 'vdcp-ba-draft-edge' -TimeoutSec $HealthTimeoutSec
if (-not $portalHealthy -or -not $edgeHealthy) {
    Write-Error "DOCKER_DEPLOYMENT_BLOCKED: containers did not become healthy (portal healthy=$portalHealthy, edge healthy=$edgeHealthy). Check: docker compose -p $ComposeProject -f $ComposeFile logs"
    exit 1
}
Write-Output 'Both containers are healthy.'

Write-Output '== Step 10/12: Trust the Caddy internal root CA (if authorized) =='
& (Join-Path $PSScriptRoot 'Install-BaDraftLocalCA.ps1')

Write-Output '== Step 11/12: URLs =='
Write-Output "  Host-only HTTP : http://localhost/  (redirects to HTTPS)"
Write-Output "  Host-only HTTPS: https://localhost/"
Write-Output "  LAN HTTP       : http://$($lan.IPAddress)/  (redirects to HTTPS)"
Write-Output "  LAN HTTPS      : https://$($lan.IPAddress)/"

Write-Output '== Step 12/12: Smoke tests =='
& (Join-Path $PSScriptRoot 'Test-BaDraftDocker.ps1')

Write-Output ''
Write-Output 'DOCKER_LAN_DEPLOYED'
