<#
WP-006D: idempotently removes the two project-owned Windows Firewall rules
created for the BA Draft Docker LAN stack. Requires an elevated PowerShell
session (rule deletion needs the same privilege as rule creation). Run from
vdp-portal, elevated:

    .\scripts\Remove-BaDraftFirewallRules.ps1
#>

$ErrorActionPreference = 'Stop'

$FirewallRuleHttp = 'VDCP BA Draft HTTP 80 LAN'
$FirewallRuleHttps = 'VDCP BA Draft HTTPS 443 LAN'

function Test-IsElevated {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsElevated)) {
    Write-Error 'This script must be run in an elevated PowerShell session to remove firewall rules.'
    exit 1
}

foreach ($ruleName in @($FirewallRuleHttp, $FirewallRuleHttps)) {
    $rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($rule) {
        Remove-NetFirewallRule -DisplayName $ruleName
        Write-Output "Removed firewall rule: $ruleName"
    }
    else {
        Write-Output "Firewall rule not present (nothing to remove): $ruleName"
    }
}
