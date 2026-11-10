[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param()

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'BioNexus-Operations.Common.ps1')

try {
    $environment = Get-BioNexusBackendEnvironment -EnvironmentFile (Join-Path $script:BioNexusBackendRoot '.env')
    Assert-BioNexusRequiredValues -Environment $environment -Names @('DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD')
    if (-not $environment.ContainsKey('DB_MAINTENANCE_DATABASE') -or
        [string]::IsNullOrWhiteSpace([string]$environment['DB_MAINTENANCE_DATABASE'])) {
        $environment['DB_MAINTENANCE_DATABASE'] = 'postgres'
    }

    Write-BioNexusLog 'Comprobaré que bionexus_dev y bionexus_prod tengan instalada y validada la baseline tenant antes de borrar bionexus.' 'WARN'
    if (-not $PSCmdlet.ShouldProcess("Legacy PostgreSQL database 'bionexus'", 'Drop only after validating both replacement environments')) {
        Write-BioNexusLog 'No se hizo ninguna conexión ni se eliminó ninguna base.' 'WARN'
        return
    }

    $confirmation = Read-Host "Escribe exactamente DESCARTAR bionexus para confirmar la eliminación"
    if ($confirmation -cne 'DESCARTAR bionexus') {
        throw 'Confirmación incorrecta. No se eliminó ninguna base.'
    }

    $probe = @'
const { Client } = require('pg');
async function main() {
  const admin = new Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_MAINTENANCE_DATABASE,
    connectionTimeoutMillis: 10000, statement_timeout: 15000
  });
  await admin.connect();
  try {
    const names = ['bionexus_dev', 'bionexus_prod'];
    const roles = ['bionexus_dev_app', 'bionexus_prod_app'];
    const results = [];
    for (let i = 0; i < names.length; i++) {
      const existence = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [names[i]]);
      const roleExistence = await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [roles[i]]);
      if (!existence.rowCount || !roleExistence.rowCount) {
        throw Object.assign(new Error('REPLACEMENT_ENVIRONMENT_MISSING'), { code: 'REPLACEMENT_ENVIRONMENT_MISSING' });
      }

      const client = new Client({
        host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER,
        password: process.env.DB_PASSWORD, database: names[i],
        connectionTimeoutMillis: 10000, statement_timeout: 15000
      });
      await client.connect();
      try {
        const status = await client.query(
          `SELECT current_setting('transaction_read_only') AS read_only,
                  EXISTS (SELECT 1 FROM public.migrations
                          WHERE name='BioNexusBaseline1790366400000') AS baseline,
                  EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_schema='public' AND table_name='laboratory'
                            AND column_name='access_slug' AND is_nullable='NO'
                            AND character_maximum_length=63) AS slug_column,
                  EXISTS (SELECT 1 FROM pg_constraint
                          WHERE conrelid=to_regclass('public.laboratory')
                            AND conname='CK_laboratory_access_slug_format'
                            AND contype='c') AS slug_constraint,
                  EXISTS (SELECT 1 FROM pg_indexes
                          WHERE schemaname='public' AND tablename='laboratory'
                            AND indexname='UQ_laboratory_access_slug_normalized') AS slug_index,
                  has_database_privilege($1, current_database(), 'CONNECT') AS app_can_connect,
                  has_table_privilege($1, 'public.laboratory', 'SELECT') AS app_can_read`,
          [roles[i]]
        );
        const row = status.rows[0];
        if (row.read_only !== 'off' || !row.baseline || !row.slug_column ||
            !row.slug_constraint || !row.slug_index || !row.app_can_connect || !row.app_can_read) {
          throw Object.assign(new Error(`REPLACEMENT_ENVIRONMENT_INVALID:${names[i]}`), { code: 'REPLACEMENT_ENVIRONMENT_INVALID' });
        }
        results.push({ database: names[i], tenantSchemaReady: true, applicationRoleReady: true });
      } finally { await client.end(); }
    }

    const legacy = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', ['bionexus']);
    if (!legacy.rowCount) {
      process.stdout.write(JSON.stringify({ success: true, legacyExists: false, replacements: results }));
      return;
    }
    const active = await admin.query(
      'SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',
      ['bionexus']
    );
    if (active.rows[0].count > 0) {
      throw Object.assign(new Error('LEGACY_DATABASE_HAS_ACTIVE_CONNECTIONS'), { code: 'LEGACY_DATABASE_HAS_ACTIVE_CONNECTIONS' });
    }

    await admin.query('DROP DATABASE "bionexus"');
    process.stdout.write(JSON.stringify({ success: true, legacyExists: false, replacements: results }));
  } finally { await admin.end(); }
}
main().catch(error => {
  process.stderr.write(`Legacy database retirement failed: ${error.code || 'ERROR'}\n`);
  process.exitCode = 1;
});
'@

    $previous = Set-BioNexusProcessEnvironment -Values $environment
    try {
        Push-Location $script:BioNexusBackendRoot
        try {
            $result = Invoke-BioNexusNodeJson -Code $probe
        }
        finally {
            Pop-Location
        }
    }
    finally {
        Restore-BioNexusProcessEnvironment -Values $previous
    }

    if (-not $result.success) { throw 'La validación de reemplazos no pasó. No se eliminó bionexus.' }
    Write-BioNexusLog 'bionexus_dev y bionexus_prod pasaron la validación de esquema y roles de aplicación.' 'OK'
    if ($result.legacyExists) {
        Write-BioNexusLog 'La base bionexus fue eliminada después de validar los dos reemplazos.' 'OK'
    }
    else {
        Write-BioNexusLog 'La base bionexus ya no existía; los dos reemplazos fueron validados.' 'OK'
    }
}
catch {
    Write-BioNexusLog $_.Exception.Message 'ERROR'
    exit 1
}
