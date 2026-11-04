[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'BioNexus-Operations.Common.ps1')
$environment = @{}

function ConvertTo-BioNexusPlainText {
    param([Parameter(Mandatory = $true)][Security.SecureString]$SecureValue)
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

try {
    $secretFile = Join-Path $env:LOCALAPPDATA 'BioNexus\database-credentials\Development.xml'
    if (-not (Test-Path -LiteralPath $secretFile -PathType Leaf)) {
        throw "No se encontró la credencial protegida de desarrollo. Primero instala bionexus_dev con Install-BioNexus-Environment.ps1."
    }

    $secret = Import-Clixml -LiteralPath $secretFile
    if ($secret.Environment -cne 'Development' -or
        $secret.Database -cne 'bionexus_dev' -or
        $secret.Username -cne 'bionexus_dev_app' -or
        $secret.Password -isnot [Security.SecureString]) {
        throw 'El archivo protegido no corresponde a la configuración esperada de desarrollo.'
    }

    $environment = Get-BioNexusBackendEnvironment -EnvironmentFile (Join-Path $script:BioNexusBackendRoot '.env')
    Assert-BioNexusRequiredValues -Environment $environment -Names @('DB_HOST', 'DB_PORT')
    $environment['DB_DATABASE'] = 'bionexus_dev'
    $environment['DB_USER'] = 'bionexus_dev_app'
    $environment['DB_PASSWORD'] = ConvertTo-BioNexusPlainText -SecureValue $secret.Password
    $environment['HOST'] = '127.0.0.1'
    $environment['PORT'] = '3002'
    $environment['CORS_ORIGINS'] = 'http://localhost:8081'
    $environment['HTTPS_ENABLED'] = 'false'
    if (-not $environment.ContainsKey('BIONEXUS_TENANT_DOMAIN')) {
        $environment['BIONEXUS_TENANT_DOMAIN'] = 'bionexus.app'
    }
    $environment.Remove('BIONEXUS_OWNER_PASSWORD')

    $previous = Set-BioNexusProcessEnvironment -Values $environment
    try {
        Push-Location $script:BioNexusBackendRoot
        try {
            $probe = @'
const { Client } = require('pg');
async function main() {
  const client = new Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
    connectionTimeoutMillis: 10000, statement_timeout: 15000
  });
  await client.connect();
  try {
    await client.query('BEGIN TRANSACTION READ ONLY');
    const result = await client.query(
      `SELECT current_database() AS database, current_user AS role,
              current_setting('transaction_read_only') AS read_only,
              EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema='public' AND table_name='laboratory' AND column_name='access_slug') AS slug_column,
              EXISTS (SELECT 1 FROM public.migrations
                      WHERE name='BioNexusBaseline1790366400000') AS baseline`
    );
    if (result.rows[0].database !== 'bionexus_dev' ||
        result.rows[0].role !== 'bionexus_dev_app' ||
        result.rows[0].read_only !== 'on' ||
        !result.rows[0].slug_column ||
        !result.rows[0].baseline) {
      throw Object.assign(new Error('DEVELOPMENT_DATABASE_NOT_READY'), { code: 'DEVELOPMENT_DATABASE_NOT_READY' });
    }
    await client.query('ROLLBACK');
    process.stdout.write(JSON.stringify({ ready: true }));
  } finally { await client.end(); }
}
main().catch(error => {
  process.stderr.write(`Development preflight failed: ${error.code || 'ERROR'}\n`);
  process.exitCode = 1;
});
'@
            $state = Invoke-BioNexusNodeJson -Code $probe
        }
        finally {
            Pop-Location
        }
    }
    finally {
        Restore-BioNexusProcessEnvironment -Values $previous
    }
    if (-not $state.ready) { throw 'El preflight de bionexus_dev no pasó; no inicié servicios.' }

    Assert-BioNexusPortAvailable -Port 3002 -ServiceName 'Backend de desarrollo'
    Assert-BioNexusPortAvailable -Port 8081 -ServiceName 'Frontend de desarrollo'

    $frontendEnvironment = @{
        VITE_API_URL = ''
        VITE_TENANT_BASE_DOMAIN = 'bionexus.app'
    }
    $backendProcess = Start-BioNexusConsole -WorkingDirectory $script:BioNexusBackendRoot -Command 'npm run start:dev' -Environment $environment
    $frontendProcess = Start-BioNexusConsole -WorkingDirectory $script:BioNexusFrontendRoot -Command 'npm run dev -- --host localhost --port 8081 --strictPort' -Environment $frontendEnvironment

    Write-BioNexusLog "Backend de desarrollo iniciado (PID $($backendProcess.Id)); base bionexus_dev y rol bionexus_dev_app." 'OK'
    Write-BioNexusLog "Frontend iniciado (PID $($frontendProcess.Id)); abre http://localhost:8081/l/<access_slug>/login cuando ambos estén listos." 'OK'
    Write-BioNexusLog 'Los procesos usan la credencial cifrada de Windows. No se modificó ninguna base.' 'INFO'
}
catch {
    Write-BioNexusLog $_.Exception.Message 'ERROR'
    exit 1
}
finally {
    $environment['DB_PASSWORD'] = $null
}
