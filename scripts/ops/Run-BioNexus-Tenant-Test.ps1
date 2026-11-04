[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^bionexus_(tenant_)?test_[a-z0-9_]+$')]
    [string]$DatabaseName,

    [Parameter(Mandatory = $true)]
    [switch]$ConfirmTestDatabase,

    [switch]$PreflightOnly
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'BioNexus-Operations.Common.ps1')

try {
    if (-not $ConfirmTestDatabase) {
        throw 'Debes confirmar que el nombre corresponde a una base desechable pasando -ConfirmTestDatabase.'
    }

    $DatabaseName = $DatabaseName.Trim().ToLowerInvariant()
    if ($DatabaseName -eq 'bionexus') {
        throw 'La base autorizada bionexus no se puede usar para esta prueba.'
    }

    $frontendPackage = Join-Path $script:BioNexusFrontendRoot 'package.json'
    $environmentFile = Join-Path $script:BioNexusBackendRoot '.env'
    if (-not (Test-Path -LiteralPath $frontendPackage -PathType Leaf)) {
        throw "No se encontró el repositorio Frontend esperado: $script:BioNexusFrontendRoot"
    }
    if (-not (Test-Path -LiteralPath (Join-Path $script:BioNexusBackendRoot 'node_modules') -PathType Container) -or
        -not (Test-Path -LiteralPath (Join-Path $script:BioNexusFrontendRoot 'node_modules') -PathType Container)) {
        throw 'Faltan dependencias node_modules en Backend o Frontend. No se instalaron dependencias.'
    }

    $environment = Get-BioNexusBackendEnvironment -EnvironmentFile $environmentFile
    Assert-BioNexusRequiredValues -Environment $environment -Names @('DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD')
    $environment['DB_DATABASE'] = $DatabaseName
    $environment['HOST'] = '127.0.0.1'
    $environment['PORT'] = '33002'
    $environment['CORS_ORIGINS'] = 'http://127.0.0.1:8082'
    $environment['HTTPS_ENABLED'] = 'false'
    if (-not $environment.ContainsKey('BIONEXUS_TENANT_DOMAIN')) {
        $environment['BIONEXUS_TENANT_DOMAIN'] = 'bionexus.app'
    }

    $frontendEnvironment = @{
        VITE_API_URL = 'http://127.0.0.1:33002'
        VITE_TENANT_BASE_DOMAIN = 'bionexus.app'
    }

    Write-BioNexusLog "Validando solo lectura que '$DatabaseName' contiene la baseline tenant."
    if (-not $PSCmdlet.ShouldProcess("Disposable database '$DatabaseName'", 'Start isolated Backend and Frontend test servers')) {
        Write-BioNexusLog 'No se consultó la base ni se iniciaron servidores.' 'WARN'
        return
    }

    $previous = Set-BioNexusProcessEnvironment -Values $environment
    try {
        Push-Location $script:BioNexusBackendRoot
        try {
            $probe = @'
const { Client } = require('pg');
async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });
  await client.connect();
  try {
    const schema = await client.query(
      `SELECT count(*)::int AS columns
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'laboratory'
         AND column_name = 'access_slug'`
    );
    if (schema.rows[0].columns !== 1) {
      process.stdout.write(JSON.stringify({ ready: false, reason: 'TENANT_BASELINE_MISSING' }));
      return;
    }
    const tenants = await client.query('SELECT count(*)::int AS count FROM laboratory WHERE access_slug IS NOT NULL');
    process.stdout.write(JSON.stringify({ ready: tenants.rows[0].count > 0, tenantCount: tenants.rows[0].count }));
  } finally {
    await client.end();
  }
}
main().catch(error => {
  process.stderr.write(`Test database preflight failed: ${error.code || error.name || 'ERROR'}\n`);
  process.exitCode = 1;
});
'@
            $databaseState = Invoke-BioNexusNodeJson -Code $probe
            if (-not $databaseState.ready) {
                if ($databaseState.reason) {
                    throw "La base '$DatabaseName' no tiene la baseline tenant actual. No inicié los servidores."
                }
                throw "La base '$DatabaseName' no contiene un laboratorio con access_slug. Provisiona uno primero; no se modificó la base."
            }

            Write-BioNexusLog "Preflight de '$DatabaseName' correcto: baseline tenant y laboratorio con access_slug detectados." 'OK'
        }
        finally {
            Pop-Location
        }
    }
    finally {
        Restore-BioNexusProcessEnvironment -Values $previous
    }

    if ($PreflightOnly) {
        Write-BioNexusLog 'Preflight solamente: no inicié servidores ni modifiqué la base.' 'OK'
        return
    }

    Assert-BioNexusPortAvailable -Port 33002 -ServiceName 'Backend de prueba'
    Assert-BioNexusPortAvailable -Port 8082 -ServiceName 'Frontend de prueba'

    $backendCommand = 'npm run start:dev'
    $frontendCommand = 'npm run dev -- --host 127.0.0.1 --port 8082'
    $backendProcess = Start-BioNexusConsole -WorkingDirectory $script:BioNexusBackendRoot -Command $backendCommand -Environment $environment
    $frontendProcess = Start-BioNexusConsole -WorkingDirectory $script:BioNexusFrontendRoot -Command $frontendCommand -Environment $frontendEnvironment

    Write-BioNexusLog "Backend iniciado en consola separada (PID $($backendProcess.Id)); DB_DATABASE='$DatabaseName'." 'OK'
    Write-BioNexusLog "Frontend iniciado en consola separada (PID $($frontendProcess.Id))." 'OK'
    Write-BioNexusLog 'Espera a que ambos indiquen que están listos; abre http://127.0.0.1:8082/l/<access_slug>/login' 'OK'
    Write-BioNexusLog 'Este script no ejecuta migraciones, no cambia ramas, no hace commits y no termina procesos.' 'WARN'
}
catch {
    Write-BioNexusLog $_.Exception.Message 'ERROR'
    exit 1
}
