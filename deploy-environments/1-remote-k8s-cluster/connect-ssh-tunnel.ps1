<#
.SYNOPSIS
    Script khởi tạo SSH Tunnel tới Bastion Host của cụm RKE2 Lakehouse Platform.
.DESCRIPTION
    Forward các cổng 443 (HTTPS Ingress) và 30030 (StarRocks NodePort) về máy local.
#>

param (
    [string]$BastionHost = "10.167.70.16",
    [string]$SSHUser = "root",
    [int]$SSHPort = 22
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  ĐANG KẾT NỐI SSH TUNNEL TỚI BASTION HOST: $SSHUser@$BastionHost" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Port mapping:"
Write-Host "  - Local 443   -> Remote Traefik Ingress (HTTPS)"
Write-Host "  - Local 30030 -> Remote StarRocks NodePort (SQL)"
Write-Host "Nhấn Ctrl+C để ngắt kết nối khi dev xong." -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan

ssh -N -p $SSHPort `
    -L 443:127.0.0.1:443 `
    -L 30030:10.167.70.13:30030 `
    "$SSHUser@$BastionHost"
