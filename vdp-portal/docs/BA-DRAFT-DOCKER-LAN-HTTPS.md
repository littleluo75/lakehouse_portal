# BA Draft — Docker LAN HTTP/HTTPS Deployment (WP-006D)

Runs the accepted VNPT Data Cloud Platform BA Draft through Docker Compose,
fronted by a Caddy edge reverse proxy on the trusted LAN, with automatic
HTTP→HTTPS redirection and TLS from Caddy's internal CA.

Scope: local trusted LAN only. No router NAT, no UPnP, no public DNS, no
public certificate, no real VNPT/Kubernetes/lakehouse access.

## Architecture

```text
LAN/host browser
      │
      ├── HTTP :80  → redirect to HTTPS
      └── HTTPS :443
              ↓
       Caddy edge container  (ba_draft_ingress + ba_draft_internal)
              ↓  portal:3000
       portal container      (ba_draft_internal only, internal: true)
```

The portal container publishes no host port and has no route to the public
internet; it is reachable only through Caddy.

## Prerequisites

- Docker Desktop running (`docker info` succeeds).
- Connected to the trusted LAN on the **Private** or **DomainAuthenticated**
  Windows network profile (not Public).
- Ports 80/443 free of unrelated processes.

## Start / rebuild

```powershell
cd "G:\Projects\VNPT Data Cloud Platform\lakehouse_portal\vdp-portal"
.\scripts\Start-BaDraftDocker.ps1
```

This detects the trusted LAN IPv4, validates ports and network profile,
ensures the two scoped firewall rules exist, builds and starts the stack,
waits for both containers to report healthy, trusts the Caddy internal CA
locally, prints the access URLs, and runs smoke tests.

If firewall rules are missing and the session isn't elevated, the script
prints the exact `New-NetFirewallRule` commands to run in an elevated
PowerShell window, then stops — re-run the script after creating them.

## Status / logs / restart / stop

```powershell
docker compose -p vdcp-ba-draft -f compose.ba-draft.yaml ps
docker compose -p vdcp-ba-draft -f compose.ba-draft.yaml logs -f
docker compose -p vdcp-ba-draft -f compose.ba-draft.yaml restart
.\scripts\Stop-BaDraftDocker.ps1
```

`Stop-BaDraftDocker.ps1` stops containers without removing them, networks,
or volumes, so `restart` and re-running `Start-BaDraftDocker.ps1` keep
working.

## Access URLs

- Host-only: `http://localhost/` (redirects), `https://localhost/`
- LAN: `http://<LAN_IP>/` (redirects), `https://<LAN_IP>/`

The LAN IP is auto-detected each run and never hard-coded into a committed
file.

## Installing the local CA on another BA device

Only the **public root certificate** is shared — never a private key.

1. Copy `docs/ba-draft-caddy-root-ca.crt` from this host to the BA device.
2. **Windows**: double-click the file → *Install Certificate* → *Current
   User* → *Place all certificates in the following store* → *Trusted Root
   Certification Authorities*. Or via PowerShell:
   ```powershell
   Import-Certificate -FilePath .\ba-draft-caddy-root-ca.crt -CertStoreLocation Cert:\CurrentUser\Root
   ```
3. **macOS**: open the file in *Keychain Access*, add it to the *login*
   keychain, then double-click the imported certificate and set
   *When using this certificate* → *Always Trust*.
4. Browse to `https://<LAN_IP>/` from the device — the certificate should
   now validate without a warning.

## Removing the local CA trust (this host)

`Install-BaDraftLocalCA.ps1` prints the exact thumbprint-based removal
command each time it runs. It looks like:

```powershell
Get-ChildItem Cert:\CurrentUser\Root | Where-Object Thumbprint -eq '<THUMBPRINT>' | Remove-Item
```

Only removes the single BA Draft root CA by thumbprint — never removes
other trusted certificates.

## Removing the firewall rules

```powershell
.\scripts\Remove-BaDraftFirewallRules.ps1
```

Must be run elevated. Idempotent — safe to run even if the rules are
already gone.

## Troubleshooting

- **Containers unhealthy**: `docker compose -p vdcp-ba-draft -f compose.ba-draft.yaml logs`
- **HTTPS certificate warning**: the local CA hasn't been trusted on this
  device yet — run `Install-BaDraftLocalCA.ps1` (or the manual device steps
  above), then reload the page.
- **LAN device can't reach the site**: confirm the device is on the same
  subnet, on a Private/Domain profile, and that the two `VDCP BA Draft *`
  firewall rules are `Enabled: True` with `Profile: Private, Domain` and
  `RemoteAddress: LocalSubnet`.
