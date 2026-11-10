[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'BioNexus-Operations.Common.ps1')

try {
    $environmentFile = Join-Path $script:BioNexusBackendRoot '.env'
    $environment = Get-BioNexusBackendEnvironment -EnvironmentFile $environmentFile
    Assert-BioNexusRequiredValues -Environment $environment -Names @(
        'DB_HOST',
        'DB_PORT',
        'DB_USER',
        'DB_PASSWORD',
        'DB_DATABASE'
    )

    $configuredDatabase = ([string]$environment['DB_DATABASE']).Trim()
    if ($configuredDatabase -cne 'bionexus') {
        throw "El .env no apunta exactamente a la base protegida 'bionexus'. No se realizó ninguna conexión. Configuración de base actual: '$configuredDatabase'."
    }

    $environment['DB_DATABASE'] = 'bionexus'
    Write-BioNexusLog "Iniciando diagnóstico de solo lectura para la base 'bionexus'. No se ejecutarán migraciones ni escrituras."

    $previous = Set-BioNexusProcessEnvironment -Values $environment
    try {
        Push-Location $script:BioNexusBackendRoot
        try {
            $probe = @'
const { Client } = require('pg');
const baselineName = 'BioNexusBaseline1790366400000';

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'bionexus',
    connectionTimeoutMillis: 10000,
    statement_timeout: 15000
  });
  let connected = false;
  let transactionStarted = false;

  try {
    await client.connect();
    connected = true;
    await client.query('BEGIN TRANSACTION READ ONLY');
    transactionStarted = true;

    const connection = await client.query(
      `SELECT current_database() AS database,
              current_setting('transaction_read_only') AS read_only`
    );
    if (connection.rows[0].database !== 'bionexus' || connection.rows[0].read_only !== 'on') {
      throw Object.assign(new Error('READ_ONLY_GUARD_FAILED'), { code: 'READ_ONLY_GUARD_FAILED' });
    }

    const objects = await client.query(
      `SELECT to_regclass('public.migrations') AS migrations_table,
              to_regclass('public.laboratory') AS laboratory_table`
    );
    const migrationTableExists = Boolean(objects.rows[0].migrations_table);
    const laboratoryTableExists = Boolean(objects.rows[0].laboratory_table);

    let baselineRegistered = false;
    let migrationCount = null;
    let latestMigration = null;
    if (migrationTableExists) {
      const migration = await client.query(
        'SELECT EXISTS (SELECT 1 FROM public.migrations WHERE name = $1) AS registered',
        [baselineName]
      );
      baselineRegistered = migration.rows[0].registered;
      const migrations = await client.query(
        `SELECT count(*)::int AS count,
                (SELECT name FROM public.migrations ORDER BY timestamp DESC LIMIT 1) AS latest_name,
                (SELECT timestamp::text FROM public.migrations ORDER BY timestamp DESC LIMIT 1) AS latest_timestamp
         FROM public.migrations`
      );
      migrationCount = migrations.rows[0].count;
      latestMigration = migrations.rows[0].latest_name
        ? {
            name: migrations.rows[0].latest_name,
            timestamp: migrations.rows[0].latest_timestamp
          }
        : null;
    }

    let laboratoryCount = null;
    if (laboratoryTableExists) {
      const laboratories = await client.query(
        'SELECT count(*)::int AS count FROM public.laboratory'
      );
      laboratoryCount = laboratories.rows[0].count;
    }

    let accessSlugColumn = null;
    if (laboratoryTableExists) {
      const column = await client.query(
        `SELECT is_nullable, character_maximum_length
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'laboratory'
           AND column_name = 'access_slug'`
      );
      accessSlugColumn = column.rows[0] || null;
    }
    const accessSlugColumnExists = accessSlugColumn !== null;

    let accessSlugCheckConstraintExists = false;
    let accessSlugUniqueIndexExists = false;
    let nullSlugCount = null;
    let duplicateSlugGroupCount = null;
    if (laboratoryTableExists && accessSlugColumnExists) {
      const checkConstraint = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conrelid = to_regclass('public.laboratory')
             AND conname = 'CK_laboratory_access_slug_format'
             AND contype = 'c'
         ) AS exists`
      );
      accessSlugCheckConstraintExists = checkConstraint.rows[0].exists;

      const uniqueIndex = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM pg_indexes
           WHERE schemaname = 'public'
             AND tablename = 'laboratory'
             AND indexname = 'UQ_laboratory_access_slug_normalized'
         ) AS exists`
      );
      accessSlugUniqueIndexExists = uniqueIndex.rows[0].exists;

      const dataChecks = await client.query(
        `SELECT
           (SELECT count(*)::int FROM public.laboratory WHERE access_slug IS NULL) AS null_slugs,
           (SELECT count(*)::int
            FROM (
              SELECT lower(btrim(access_slug)) AS normalized_slug
              FROM public.laboratory
              WHERE access_slug IS NOT NULL
              GROUP BY lower(btrim(access_slug))
              HAVING count(*) > 1
            ) AS duplicate_groups) AS duplicate_slug_groups`
      );
      nullSlugCount = dataChecks.rows[0].null_slugs;
      duplicateSlugGroupCount = dataChecks.rows[0].duplicate_slug_groups;
    }

    process.stdout.write(JSON.stringify({
      success: true,
      database: connection.rows[0].database,
      transactionReadOnly: connection.rows[0].read_only === 'on',
      migrationTableExists,
      migrationCount,
      latestMigration,
      baselineRegistered,
      laboratoryTableExists,
      laboratoryCount,
      accessSlugColumnExists,
      accessSlugNullable: accessSlugColumn ? accessSlugColumn.is_nullable === 'YES' : null,
      accessSlugLength: accessSlugColumn ? accessSlugColumn.character_maximum_length : null,
      accessSlugCheckConstraintExists,
      accessSlugUniqueIndexExists,
      nullSlugCount,
      duplicateSlugGroupCount
    }));
  } catch (error) {
    process.stdout.write(JSON.stringify({
      success: false,
      errorCode: error.code || error.name || 'DATABASE_CHECK_FAILED'
    }));
  } finally {
    if (transactionStarted) {
      await client.query('ROLLBACK').catch(() => undefined);
    }
    if (connected) {
      await client.end().catch(() => undefined);
    }
  }
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ success: false, errorCode: 'DATABASE_CHECK_FAILED' }));
});
'@
            $databaseState = Invoke-BioNexusNodeJson -Code $probe
        }
        finally {
            Pop-Location
        }
    }
    finally {
        Restore-BioNexusProcessEnvironment -Values $previous
    }

    if (-not $databaseState.success) {
        $errorCode = if ($databaseState.errorCode -eq '3D000') {
            'DATABASE_NOT_FOUND'
        }
        else {
            [string]$databaseState.errorCode
        }
        throw "No se pudo completar el diagnóstico de solo lectura (código: $errorCode). No se revelaron detalles de conexión."
    }

    $latestMigrationName = if ($databaseState.latestMigration) {
        [string]$databaseState.latestMigration.name
    }
    else {
        'ninguna'
    }
    $latestMigrationTimestamp = if ($databaseState.latestMigration) {
        [string]$databaseState.latestMigration.timestamp
    }
    else {
        'ninguna'
    }

    Write-BioNexusLog "Conexión confirmada a '$($databaseState.database)' con transacción READ ONLY." 'OK'
    Write-BioNexusLog "Tabla migrations: $($databaseState.migrationTableExists); migraciones registradas: $($databaseState.migrationCount); última: $latestMigrationName ($latestMigrationTimestamp); baseline BioNexusBaseline1790366400000 registrada: $($databaseState.baselineRegistered)." 'INFO'
    Write-BioNexusLog "Tabla laboratory: $($databaseState.laboratoryTableExists); filas: $($databaseState.laboratoryCount); columna access_slug: $($databaseState.accessSlugColumnExists); nullable: $($databaseState.accessSlugNullable); longitud: $($databaseState.accessSlugLength)." 'INFO'
    Write-BioNexusLog "Restricción de formato: $($databaseState.accessSlugCheckConstraintExists); índice único normalizado: $($databaseState.accessSlugUniqueIndexExists)." 'INFO'

    if ($databaseState.accessSlugColumnExists) {
        Write-BioNexusLog "Laboratorios sin slug: $($databaseState.nullSlugCount); grupos de slugs duplicados: $($databaseState.duplicateSlugGroupCount)." 'INFO'
    }
    else {
        Write-BioNexusLog 'No se consultaron datos de laboratorios porque access_slug no existe.' 'WARN'
    }

    Write-BioNexusLog 'Diagnóstico terminado. Solo se consultaron metadatos y conteos agregados; no se modificó la base.' 'OK'
}
catch {
    Write-BioNexusLog $_.Exception.Message 'ERROR'
    exit 1
}
