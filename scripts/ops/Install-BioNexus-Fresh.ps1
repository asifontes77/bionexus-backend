[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^bionexus_(dev|test|prod)(_[a-z0-9_]+)?$')]
    [string]$DatabaseName
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'BioNexus-Operations.Common.ps1')

try {
    $DatabaseName = $DatabaseName.Trim().ToLowerInvariant()
    if ($DatabaseName -eq 'bionexus') {
        throw 'La base autorizada bionexus está protegida y nunca se instala con este script.'
    }

    $environmentFile = Join-Path $script:BioNexusBackendRoot '.env'
    $environment = Get-BioNexusBackendEnvironment -EnvironmentFile $environmentFile
    Assert-BioNexusRequiredValues -Environment $environment -Names @(
        'DB_HOST',
        'DB_PORT',
        'DB_USER',
        'DB_PASSWORD'
    )

    $environment['DB_DATABASE'] = $DatabaseName
    if (-not $environment.ContainsKey('DB_MAINTENANCE_DATABASE') -or
        [string]::IsNullOrWhiteSpace([string]$environment['DB_MAINTENANCE_DATABASE'])) {
        $environment['DB_MAINTENANCE_DATABASE'] = 'postgres'
    }

    Write-BioNexusLog "Preparando instalación inicial en la base nueva '$DatabaseName'."
    Write-BioNexusLog 'La base bionexus existente está protegida; el script no elimina ni reutiliza bases ya creadas.' 'WARN'

    if (-not $PSCmdlet.ShouldProcess("PostgreSQL database '$DatabaseName'", 'Create a new database and run install:first')) {
        Write-BioNexusLog 'No se ejecutó ninguna instalación.' 'WARN'
        return
    }

    if (-not $environment.ContainsKey('BIONEXUS_OWNER_USERNAME') -or
        [string]::IsNullOrWhiteSpace([string]$environment['BIONEXUS_OWNER_USERNAME'])) {
        $environment['BIONEXUS_OWNER_USERNAME'] = Read-Host 'Nombre de usuario del propietario global'
    }
    if (-not $environment.ContainsKey('BIONEXUS_OWNER_NAME') -or
        [string]::IsNullOrWhiteSpace([string]$environment['BIONEXUS_OWNER_NAME'])) {
        $environment['BIONEXUS_OWNER_NAME'] = Read-Host 'Nombre visible del propietario global'
    }
    if (-not $environment.ContainsKey('BIONEXUS_OWNER_PASSWORD') -or
        [string]::IsNullOrWhiteSpace([string]$environment['BIONEXUS_OWNER_PASSWORD'])) {
        $securePassword = Read-Host 'Contrasena del propietario global' -AsSecureString
        if ($securePassword.Length -lt 1) {
            throw 'La contraseña del propietario no puede estar vacía.'
        }

        $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
        try {
            $environment['BIONEXUS_OWNER_PASSWORD'] = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
        }
        finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
        }
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
    database: process.env.DB_MAINTENANCE_DATABASE
  });
  await client.connect();
  try {
    const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [process.env.DB_DATABASE]);
    process.stdout.write(JSON.stringify({ exists: result.rowCount > 0 }));
  } finally {
    await client.end();
  }
}
main().catch(error => {
  process.stderr.write(`PostgreSQL preflight failed: ${error.code || error.name || 'ERROR'}\n`);
  process.exitCode = 1;
});
'@
            $databaseState = Invoke-BioNexusNodeJson -Code $probe
            if ($databaseState.exists) {
                throw "La base '$DatabaseName' ya existe. No la reinicié ni modifiqué; elige un nombre nuevo o gestiona esa base manualmente."
            }

            Write-BioNexusLog "La base '$DatabaseName' no existe; ejecutando install:first." 'OK'
            & npm run install:first
            if ($LASTEXITCODE -ne 0) {
                throw "install:first terminó con código $LASTEXITCODE. Revisa su evento JSON de resultado."
            }
        }
        finally {
            Pop-Location
        }
    }
    finally {
        Restore-BioNexusProcessEnvironment -Values $previous
    }

    Write-BioNexusLog "Instalación inicial completada en '$DatabaseName'." 'OK'
    Write-BioNexusLog 'No ejecutes bootstrap:platform-owner aparte: install:first crea al propietario inicial si todavía no existe.' 'INFO'
}
catch {
    Write-BioNexusLog $_.Exception.Message 'ERROR'
    exit 1
}
