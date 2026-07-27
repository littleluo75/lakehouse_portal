<#
WP-006D smoke tests for the running BA Draft Docker LAN stack: HTTP->HTTPS
redirect, TLS reachability, firewall rule scope, and portal outbound
network isolation. Run from vdp-portal after Start-BaDraftDocker.ps1:

    .\scripts\Test-BaDraftDocker.ps1
#>

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$FirewallRuleHttp = 'VDCP BA Draft HTTP 80 LAN'
$FirewallRuleHttps = 'VDCP BA Draft HTTPS 443 LAN'
$results = @()

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

function Add-Result([string]$Name, [bool]$Pass, [string]$Detail) {
    $script:results += [PSCustomObject]@{ Test = $Name; Pass = $Pass; Detail = $Detail }
    $status = if ($Pass) { 'PASS' } else { 'FAIL' }
    Write-Output "[$status] $Name - $Detail"
}

$lanIp = Get-BaDraftLanIP
if (-not $lanIp) { $lanIp = '127.0.0.1'; Write-Warning 'No LAN IP detected; LAN-scoped checks will target 127.0.0.1 instead.' }

Write-Output "== HTTP -> HTTPS redirect =="
foreach ($targetHost in @('localhost', '127.0.0.1', $lanIp)) {
    # Invoke-WebRequest's -MaximumRedirection 0 throws MaximumRedirectExceeded on both
    # PowerShell 5.1 and 7+ without a usable Response object, so use HttpWebRequest directly.
    $req = [System.Net.HttpWebRequest]::Create("http://$targetHost/")
    $req.AllowAutoRedirect = $false
    $req.Method = 'GET'
    try {
        $resp = $req.GetResponse()
        Add-Result "HTTP redirect ($targetHost)" ([int]$resp.StatusCode -in 301, 308) "status=$([int]$resp.StatusCode) location=$($resp.Headers['Location'])"
        $resp.Close()
    }
    catch [System.Net.WebException] {
        $resp = $_.Exception.Response
        if ($resp) {
            Add-Result "HTTP redirect ($targetHost)" ([int]$resp.StatusCode -in 301, 308) "status=$([int]$resp.StatusCode) location=$($resp.Headers['Location'])"
            $resp.Close()
        }
        else {
            Add-Result "HTTP redirect ($targetHost)" $false $_.Exception.Message
        }
    }
}

Write-Output "== HTTPS reachability (trusts installed Caddy root CA) =="
foreach ($targetHost in @('localhost', '127.0.0.1', $lanIp)) {
    try {
        $resp = Invoke-WebRequest -Uri "https://$targetHost/" -UseBasicParsing -ErrorAction Stop
        Add-Result "HTTPS reachable ($targetHost)" ($resp.StatusCode -eq 200) "status=$($resp.StatusCode)"
    }
    catch {
        Add-Result "HTTPS reachable ($targetHost)" $false $_.Exception.Message
    }
}

Write-Output "== TLS certificate subject/SAN =="
try {
    $req = [System.Net.Sockets.TcpClient]::new('127.0.0.1', 443)
    $sslStream = New-Object System.Net.Security.SslStream($req.GetStream(), $false, ({ $true }))
    $sslStream.AuthenticateAsClient('localhost')
    $cert = $sslStream.RemoteCertificate
    Add-Result 'TLS certificate present' $true "subject=$($cert.Subject) issuer=$($cert.Issuer)"
    $sslStream.Dispose(); $req.Dispose()
}
catch {
    Add-Result 'TLS certificate present' $false $_.Exception.Message
}

Write-Output "== Windows Firewall scope =="
foreach ($ruleName in @($FirewallRuleHttp, $FirewallRuleHttps)) {
    $rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($rule) {
        $addrFilter = $rule | Get-NetFirewallAddressFilter
        $portFilter = $rule | Get-NetFirewallPortFilter
        $detail = "enabled=$($rule.Enabled) profile=$($rule.Profile) edgeTraversal=$($rule.EdgeTraversalPolicy) remote=$($addrFilter.RemoteAddress) localPort=$($portFilter.LocalPort)"
        Add-Result "Firewall rule '$ruleName'" ($rule.Enabled -eq 'True') $detail
    }
    else {
        Add-Result "Firewall rule '$ruleName'" $false 'rule not found'
    }
}

Write-Output "== Portal outbound network isolation (internal network only) =="
try {
    $probe = docker exec vdcp-ba-draft-portal node -e "fetch('http://1.1.1.1', {signal: AbortSignal.timeout(4000)}).then(()=>console.log('REACHABLE')).catch((e)=>console.log('BLOCKED:'+e.message))" 2>&1
    $blocked = $probe -match 'BLOCKED'
    Add-Result 'Portal public-internet outbound denied' $blocked "$probe"
}
catch {
    Add-Result 'Portal public-internet outbound denied' $false $_.Exception.Message
}

Write-Output ''
$failCount = ($results | Where-Object { -not $_.Pass }).Count
Write-Output "Summary: $($results.Count) checks, $failCount failed."
if ($failCount -gt 0) { exit 1 }
