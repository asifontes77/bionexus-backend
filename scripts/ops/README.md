# Bio Nexus operational scripts

These scripts live in the Backend repository and coordinate the sibling `Bio Nexus Frontend` repository. Run them from any directory; paths are resolved relative to this folder.

Open PowerShell in `C:\Users\Alexis\Documents\Bio Nexus\Aplicacion\Bio Nexus Backend` and run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Test-BioNexus-Ready.ps1"
```

## Test access to an already-provisioned disposable tenant

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Run-BioNexus-Tenant-Test.ps1" -DatabaseName "bionexus_tenant_test_20261104" -ConfirmTestDatabase
```

The script checks that the database name matches a test-only pattern, verifies the tenant baseline and at least one laboratory using read-only queries, refuses occupied ports, then opens separate Backend and Frontend consoles. It does not migrate or seed a database, change branches, commit, or terminate processes.

To verify database readiness without opening consoles:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Run-BioNexus-Tenant-Test.ps1" -DatabaseName "bionexus_tenant_test_20261104" -ConfirmTestDatabase -PreflightOnly
```

## Fresh platform installation

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\ops\Install-BioNexus-Fresh.ps1" -DatabaseName "bionexus_dev"
```

The target name must be `bionexus_dev`, `bionexus_test`, `bionexus_prod`, or a suffixed variant. The script refuses the protected `bionexus` database and refuses to use any database that already exists. It checks that database connection settings exist in the local Backend `.env` without printing values. After confirming the operation, it prompts for the platform owner's username and display name if they are absent from `.env`, and securely prompts for the password without echoing or saving it. Then it runs `npm run install:first`. A database created by the installer is cleaned up by `install:first` if installation fails. The script never drops an existing database.

`install:first` applies the current baseline, creates the initial platform owner when one is absent, publishes initial catalogs, and validates that no laboratories or tenant users exist yet. Do not separately run `bootstrap:platform-owner` after a successful fresh install. Do not use `bootstrap:first-admin` for the platform owner flow.

## Logs and safety

Each phase writes a timestamped status line to the console. Scripts intentionally do not log `.env` values. No script points at or resets `bionexus` by default. Keep production credentials out of command-line arguments and chat. Use `-WhatIf` to inspect the requested fresh-install action without prompting for owner credentials or connecting to PostgreSQL.

Before deploying the tenant subdomain feature, separately configure the Cloudflare/Railway wildcard DNS and TLS, frontend SPA fallback, and same-origin `/api` proxy preserving the laboratory `Host`.

## Cloudflare DNS with Railway

The current screenshot shows `bionexus.app` as a proxied CNAME to a Railway hostname and a Railway verification TXT record; there is no wildcard record yet. Do not guess the wildcard target from the apex target:

1. In Railway, open the public service that will receive the tenant hostnames, add the custom domain `*.bionexus.app`, and copy every DNS record Railway shows for that wildcard.
2. In Cloudflare DNS, add the wildcard CNAME with Name `*` and the exact target Railway provides. Add the exact Railway verification TXT record. Add the `_acme-challenge` CNAME Railway provides and leave it **DNS only** (grey cloud). Keep the existing apex `@` CNAME and verification record unless Railway explicitly asks to replace them.
3. In Cloudflare, make sure Universal SSL is enabled and set SSL/TLS encryption mode to **Full (strict)**. The application origin must also present a valid certificate; Railway provisions the custom-domain certificate after verification.
4. Configure the Railway service or gateway so the wildcard host serves the frontend, `/api` is proxied to the Backend on the same origin, the original trusted Host reaches the Backend, and unknown frontend paths fall back to the SPA entry point.
5. Test `https://<access_slug>.bionexus.app/dashboard` only after Railway verifies the wildcard domain and DNS/TLS have propagated.

Cloudflare wildcard DNS supports proxied records, but the values and verification names must come from Railway. Railway's Trial plan allows one custom domain per service; the screenshot's apex domain plus a wildcard may require a plan that allows at least two custom domains. The apex `bionexus.app` is separate from `*.bionexus.app`; `www` is also separate and is not required for tenant access.

References: [Railway custom and wildcard domains](https://docs.railway.com/networking/domains/working-with-domains) and [Cloudflare wildcard DNS records](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/).
