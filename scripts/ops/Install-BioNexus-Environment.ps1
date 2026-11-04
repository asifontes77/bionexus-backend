[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Development', 'Production')]
    [string]$EnvironmentName
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'BioNexus-Operations.Common.ps1')

$EnvironmentName = if ($EnvironmentName -ieq 'Development') { 'Development' } else { 'Production' }
$databaseName = if ($EnvironmentName -eq 'Development') { 'bionexus_dev' } else { 'bionexus_prod' }
$applicationRole = if ($EnvironmentName -eq 'Development') { 'bionexus_dev_app' } else { 'bionexus_prod_app' }
$secretFile = Join-Path $env:LOCALAPPDATA "BioNexus\database-credentials\$EnvironmentName.xml"
$databaseCreated = $false
$roleCreated = $false
$secretCreated = $false
$environment = @{}
$ownerSecurePassword = $null
$applicationSecurePassword = $null
$applicationPassword = $null
$randomBytes = $null
$randomGenerator = $null
$ownerPasswordPointer = [IntPtr]::Zero

function Invoke-BioNexusAdminNode {
    param([Parameter(Mandatory = $true)][string]$Code)
    Push-Location $script:BioNexusBackendRoot
    try {
        $encodedCode = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Code))
        $runner = 'eval(Buffer.from(process.argv[1], ''base64'').toString(''utf8''))'
        $output = & node -e $runner $encodedCode
        if ($LASTEXITCODE -ne 0) {
            throw 'Falló la operación PostgreSQL administrativa; no se imprimieron secretos.'
        }
        return ($output | ConvertFrom-Json)
    }
    finally {
        Pop-Location
    }
}

function Remove-BioNexusCreatedResources {
    param(
        [hashtable]$Environment,
        [bool]$DropDatabase,
        [bool]$DropRole
    )
    if (-not $DropDatabase -and -not $DropRole) {
        return
    }

    $cleanup = @'
const { Client } = require('pg');
async function main() {
  const maintenance = new Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_MAINTENANCE_DATABASE
  });
  await maintenance.connect();
  try {
    if (process.env.BIONEXUS_CLEANUP_DATABASE === 'true') {
      const exists = await maintenance.query(
        'SELECT 1 FROM pg_database WHERE datname=$1',
        [process.env.BIONEXUS_TARGET_DATABASE]
      );
      if (exists.rowCount) {
        const active = await maintenance.query(
          'SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',
          [process.env.BIONEXUS_TARGET_DATABASE]
        );
        if (active.rows[0].count > 0) throw new Error('CLEANUP_DATABASE_HAS_CONNECTIONS');
        await maintenance.query(`DROP DATABASE "${process.env.BIONEXUS_TARGET_DATABASE}"`);
      }
    }
    if (process.env.BIONEXUS_CLEANUP_ROLE === 'true') {
      await maintenance.query(`DROP ROLE IF EXISTS "${process.env.BIONEXUS_TARGET_ROLE}"`);
    }
    process.stdout.write(JSON.stringify({ success: true }));
  } finally { await maintenance.end(); }
}
main().catch(error => {
  process.stderr.write(`Cleanup failed: ${error.code || error.message || 'ERROR'}\n`);
  process.exitCode = 1;
});
'@
    $cleanupEnvironment = @{}
    foreach ($key in $Environment.Keys) { $cleanupEnvironment[$key] = $Environment[$key] }
    $cleanupEnvironment['BIONEXUS_CLEANUP_DATABASE'] = $DropDatabase.ToString().ToLowerInvariant()
    $cleanupEnvironment['BIONEXUS_CLEANUP_ROLE'] = $DropRole.ToString().ToLowerInvariant()
    $cleanupEnvironment['BIONEXUS_TARGET_DATABASE'] = $databaseName
    $cleanupEnvironment['BIONEXUS_TARGET_ROLE'] = $applicationRole
    $previous = Set-BioNexusProcessEnvironment -Values $cleanupEnvironment
    try {
        $null = Invoke-BioNexusAdminNode -Code $cleanup
    }
    finally {
        Restore-BioNexusProcessEnvironment -Values $previous
    }
}

try {
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
        throw 'El almacenamiento protegido de credenciales de este script requiere Windows.'
    }

    $environment = Get-BioNexusBackendEnvironment -EnvironmentFile (Join-Path $script:BioNexusBackendRoot '.env')
    Assert-BioNexusRequiredValues -Environment $environment -Names @('DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD')
    if (-not $environment.ContainsKey('DB_MAINTENANCE_DATABASE') -or
        [string]::IsNullOrWhiteSpace([string]$environment['DB_MAINTENANCE_DATABASE'])) {
        $environment['DB_MAINTENANCE_DATABASE'] = 'postgres'
    }
    Write-BioNexusLog "Preparando instalación limpia del entorno $EnvironmentName en '$databaseName' con rol de aplicación '$applicationRole'."
    Write-BioNexusLog 'La base existente bionexus se conservará durante este proceso.' 'WARN'
    if (-not $PSCmdlet.ShouldProcess("New PostgreSQL database '$databaseName' and role '$applicationRole'", 'Create, install baseline, and configure least-privilege application access')) {
        Write-BioNexusLog 'No se creó ningún recurso.' 'WARN'
        return
    }

    if (-not $environment.ContainsKey('BIONEXUS_OWNER_USERNAME') -or
        [string]::IsNullOrWhiteSpace([string]$environment['BIONEXUS_OWNER_USERNAME'])) {
        $environment['BIONEXUS_OWNER_USERNAME'] = Read-Host "Usuario del propietario de plataforma para $EnvironmentName"
    }
    if (-not $environment.ContainsKey('BIONEXUS_OWNER_NAME') -or
        [string]::IsNullOrWhiteSpace([string]$environment['BIONEXUS_OWNER_NAME'])) {
        $environment['BIONEXUS_OWNER_NAME'] = Read-Host "Nombre visible del propietario para $EnvironmentName"
    }
    $ownerSecurePassword = Read-Host "Contraseña oculta del propietario de plataforma ($EnvironmentName)" -AsSecureString
    if ($ownerSecurePassword.Length -lt 1) { throw 'La contraseña del propietario no puede estar vacía.' }
    $ownerPasswordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ownerSecurePassword)
    $environment['BIONEXUS_OWNER_PASSWORD'] = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ownerPasswordPointer)

    $randomBytes = New-Object byte[] 36
    $randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $randomGenerator.GetBytes($randomBytes)
        $applicationPassword = [Convert]::ToBase64String($randomBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
    }
    finally {
        [Array]::Clear($randomBytes, 0, $randomBytes.Length)
        $randomGenerator.Dispose()
    }
    $applicationSecurePassword = ConvertTo-SecureString -String $applicationPassword -AsPlainText -Force
    Write-BioNexusLog "Se generó una contraseña aleatoria para '$applicationRole'; no se mostrará y se guardará cifrada localmente." 'INFO'

    $adminProbe = @'
const { Client } = require('pg');
async function main() {
  const client = new Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_MAINTENANCE_DATABASE,
    connectionTimeoutMillis: 10000
  });
  await client.connect();
  try {
    const permissions = await client.query(
      'SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname=current_user'
    );
    const database = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [process.env.DB_DATABASE]);
    const role = await client.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [process.env.BIONEXUS_TARGET_ROLE]);
    const row = permissions.rows[0];
    process.stdout.write(JSON.stringify({
      canCreateDatabase: Boolean(row && (row.rolsuper || row.rolcreatedb)),
      canCreateRole: Boolean(row && (row.rolsuper || row.rolcreaterole)),
      databaseExists: database.rowCount > 0,
      roleExists: role.rowCount > 0
    }));
  } finally { await client.end(); }
}
main().catch(error => {
  process.stderr.write(`PostgreSQL preflight failed: ${error.code || error.name || 'ERROR'}\n`);
  process.exitCode = 1;
});
'@
    $environment['DB_DATABASE'] = $databaseName
    $environment['BIONEXUS_TARGET_ROLE'] = $applicationRole
    $previous = Set-BioNexusProcessEnvironment -Values $environment
    try {
        $state = Invoke-BioNexusAdminNode -Code $adminProbe
    }
    finally {
        Restore-BioNexusProcessEnvironment -Values $previous
    }

    if (-not $state.canCreateDatabase -or -not $state.canCreateRole) {
        throw 'El usuario PostgreSQL del .env necesita permisos CREATEDB y CREATEROLE para preparar los entornos.'
    }
    if ($state.databaseExists) { throw "La base '$databaseName' ya existe. No fue modificada." }
    if ($state.roleExists) { throw "El rol '$applicationRole' ya existe. No fue modificado." }
    if (Test-Path -LiteralPath $secretFile) { throw "Ya existe un archivo de credenciales protegido para $EnvironmentName. No se sobrescribió." }

    $createRoleCode = @'
const { Client } = require('pg');
async function main() {
  const client = new Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_MAINTENANCE_DATABASE
  });
  await client.connect();
  try {
    const role = `"${process.env.BIONEXUS_TARGET_ROLE.replace(/"/g, '""')}"`;
    const password = `'${process.env.BIONEXUS_APP_PASSWORD.replace(/'/g, "''")}'`;
    await client.query(`CREATE ROLE ${role} LOGIN PASSWORD ${password} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`);
    process.stdout.write(JSON.stringify({ success: true }));
  } finally { await client.end(); }
}
main().catch(error => {
  process.stderr.write(`Role creation failed: ${error.code || 'ERROR'}\n`);
  process.exitCode = 1;
});
'@
    $roleEnvironment = @{}
    foreach ($key in $environment.Keys) { $roleEnvironment[$key] = $environment[$key] }
    $roleEnvironment['BIONEXUS_APP_PASSWORD'] = $applicationPassword
    $previous = Set-BioNexusProcessEnvironment -Values $roleEnvironment
    try {
        $null = Invoke-BioNexusAdminNode -Code $createRoleCode
        $roleCreated = $true
    }
    finally {
        Restore-BioNexusProcessEnvironment -Values $previous
        $roleEnvironment['BIONEXUS_APP_PASSWORD'] = $null
    }
    Write-BioNexusLog "Rol '$applicationRole' creado sin privilegios administrativos." 'OK'

    $createDatabaseCode = @'
const { Client } = require('pg');
async function main() {
  const client = new Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_MAINTENANCE_DATABASE
  });
  await client.connect();
  try {
    await client.query(`CREATE DATABASE "${process.env.DB_DATABASE.replace(/"/g, '""')}"`);
    process.stdout.write(JSON.stringify({ success: true }));
  } finally { await client.end(); }
}
main().catch(error => {
  process.stderr.write(`Database creation failed: ${error.code || 'ERROR'}\n`);
  process.exitCode = 1;
});
'@
    $previous = Set-BioNexusProcessEnvironment -Values $environment
    try {
        $null = Invoke-BioNexusAdminNode -Code $createDatabaseCode
        $databaseCreated = $true
    }
    finally {
        Restore-BioNexusProcessEnvironment -Values $previous
    }
    Write-BioNexusLog "Base '$databaseName' creada. Ejecutando install:first con la cuenta administrativa." 'OK'

    $previous = Set-BioNexusProcessEnvironment -Values $environment
    try {
        Push-Location $script:BioNexusBackendRoot
        try {
            & npm run install:first
            if ($LASTEXITCODE -ne 0) {
                throw "install:first terminó con código $LASTEXITCODE."
            }
        }
        finally {
            Pop-Location
        }
    }
    finally {
        Restore-BioNexusProcessEnvironment -Values $previous
    }

    $grantCode = @'
const { Client } = require('pg');
async function main() {
  const client = new Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE
  });
  await client.connect();
  try {
    const role = `"${process.env.BIONEXUS_TARGET_ROLE.replace(/"/g, '""')}"`;
    const admin = `"${process.env.DB_USER.replace(/"/g, '""')}"`;
    await client.query(`GRANT CONNECT ON DATABASE "${process.env.DB_DATABASE}" TO ${role}`);
    await client.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
    await client.query(`GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
    await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${admin} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`);
    await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${admin} IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${role}`);
    process.stdout.write(JSON.stringify({ success: true }));
  } finally { await client.end(); }
}
main().catch(error => {
  process.stderr.write(`Application grants failed: ${error.code || 'ERROR'}\n`);
  process.exitCode = 1;
});
'@
    $environment['BIONEXUS_TARGET_ROLE'] = $applicationRole
    $previous = Set-BioNexusProcessEnvironment -Values $environment
    try {
        $null = Invoke-BioNexusAdminNode -Code $grantCode
    }
    finally {
        Restore-BioNexusProcessEnvironment -Values $previous
    }

    $verifyCode = @'
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
    const state = await client.query(
      `SELECT current_database() AS database, current_user AS role,
              current_setting('transaction_read_only') AS read_only,
              EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema='public' AND table_name='laboratory' AND column_name='access_slug'
                        AND is_nullable='NO' AND character_maximum_length=63) AS slug_column,
              EXISTS (SELECT 1 FROM pg_constraint
                      WHERE conrelid=to_regclass('public.laboratory')
                        AND conname='CK_laboratory_access_slug_format' AND contype='c') AS slug_constraint,
              EXISTS (SELECT 1 FROM pg_indexes
                      WHERE schemaname='public' AND tablename='laboratory'
                        AND indexname='UQ_laboratory_access_slug_normalized') AS slug_index,
              EXISTS (SELECT 1 FROM public.migrations WHERE name='BioNexusBaseline1790366400000') AS baseline`
    );
    if (state.rows[0].read_only !== 'on' || !state.rows[0].slug_column ||
        !state.rows[0].slug_constraint || !state.rows[0].slug_index || !state.rows[0].baseline) {
      throw Object.assign(new Error('ENVIRONMENT_VALIDATION_FAILED'), { code: 'ENVIRONMENT_VALIDATION_FAILED' });
    }
    await client.query('ROLLBACK');
    process.stdout.write(JSON.stringify({
      success: true, database: state.rows[0].database, role: state.rows[0].role,
      tenantSchemaReady: state.rows[0].slug_column, baselineRegistered: state.rows[0].baseline
    }));
  } finally { await client.end(); }
}
main().catch(error => {
  process.stderr.write(`Environment validation failed: ${error.code || 'ERROR'}\n`);
  process.exitCode = 1;
});
'@
    $runtimeEnvironment = @{}
    foreach ($key in $environment.Keys) { $runtimeEnvironment[$key] = $environment[$key] }
    $runtimeEnvironment['DB_DATABASE'] = $databaseName
    $runtimeEnvironment['DB_USER'] = $applicationRole
    $runtimeEnvironment['DB_PASSWORD'] = $applicationPassword
    $previous = Set-BioNexusProcessEnvironment -Values $runtimeEnvironment
    try {
        $validation = Invoke-BioNexusAdminNode -Code $verifyCode
    }
    finally {
        Restore-BioNexusProcessEnvironment -Values $previous
        $runtimeEnvironment['DB_PASSWORD'] = $null
    }
    if (-not $validation.success) { throw 'La validación de la base nueva no pasó.' }

    $secretDirectory = Split-Path -Parent $secretFile
    New-Item -ItemType Directory -Path $secretDirectory -Force | Out-Null
    $secret = [pscustomobject]@{
        Environment = $EnvironmentName
        Database = $databaseName
        Username = $applicationRole
        Password = $applicationSecurePassword
    }
    $secret | Export-Clixml -LiteralPath $secretFile
    $secretCreated = $true
    Write-BioNexusLog "Credencial de aplicación guardada cifrada para este usuario Windows en '$secretFile'." 'OK'

    Write-BioNexusLog "Entorno $EnvironmentName validado: base '$databaseName', rol runtime '$applicationRole', baseline tenant presente." 'OK'
    Write-BioNexusLog "La base bionexus todavía no fue borrada. Elimínala solo mediante el script protegido después de validar ambos entornos." 'WARN'
}
catch {
    Write-BioNexusLog $_.Exception.Message 'ERROR'
    if ($roleCreated -or $databaseCreated) {
        try {
            Remove-BioNexusCreatedResources -Environment $environment -DropDatabase $databaseCreated -DropRole $roleCreated
            Write-BioNexusLog 'Se limpiaron únicamente los recursos nuevos creados durante esta ejecución fallida.' 'WARN'
        }
        catch {
            Write-BioNexusLog "La limpieza automática no pudo completarse: $($_.Exception.Message). No vuelvas a ejecutar hasta revisar el estado." 'ERROR'
        }
    }
    if ($secretCreated -and (Test-Path -LiteralPath $secretFile)) {
        Remove-Item -LiteralPath $secretFile -Force
    }
    exit 1
}
finally {
    if ($ownerPasswordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ownerPasswordPointer)
    }
    $applicationPassword = $null
    if ($randomBytes) { [Array]::Clear($randomBytes, 0, $randomBytes.Length) }
    if ($randomGenerator) { $randomGenerator.Dispose() }
    if ($environment) { $environment['BIONEXUS_OWNER_PASSWORD'] = $null }
    if ($environment) { $environment['DB_PASSWORD'] = $null }
    if ($ownerSecurePassword) { $ownerSecurePassword.Dispose() }
    if ($applicationSecurePassword) { $applicationSecurePassword.Dispose() }
}
