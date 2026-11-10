[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Development', 'Production')]
    [string]$EnvironmentName
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'BioNexus-Operations.Common.ps1')

$targets = @{
    Development = 'bionexus_dev'
    Production = 'bionexus_prod'
}
$targetDatabase = $targets[$EnvironmentName]

function Get-BioNexusMigrationStatus {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Database
    )

    $values = @{}
    foreach ($key in $script:adminEnvironment.Keys) {
        $values[$key] = $script:adminEnvironment[$key]
    }
    $values['DB_DATABASE'] = $Database
    $previous = Set-BioNexusProcessEnvironment -Values $values
    try {
        Push-Location $script:BioNexusBackendRoot
        try {
            $output = & npm run migration:show 2>&1
            if ($LASTEXITCODE -ne 0) {
                throw "TypeORM no pudo consultar el estado de migraciones para '$Database'."
            }
            $schema = Get-BioNexusSchemaReadiness -Database $Database
        }
        finally {
            Pop-Location
        }
    }
    finally {
        Restore-BioNexusProcessEnvironment -Values $previous
    }

    $text = ($output | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
    $migrations = @(
        foreach ($line in ($text -split '\r?\n')) {
            if ($line -match '^\s*\[(X| )\]\s+(?:\d+\s+)?(\S+)\s*$') {
                [pscustomobject]@{
                    Applied = $Matches[1] -eq 'X'
                    Name = $Matches[2]
                }
            }
        }
    )
    $required = @(
        'BioNexusBaseline1790366400000',
        'AddPlatformLaboratoryLifecycle1793847600000',
        'AddPlatformSubscriptionCatalogAndBilling1793862000000',
        'AddCommercialPlanModel1793862001000'
    )
    $loadedNames = @($migrations | ForEach-Object { $_.Name })
    $notLoaded = @($required | Where-Object { $_ -notin $loadedNames })
    if ($notLoaded.Count -gt 0) {
        throw "TypeORM no cargó las migraciones esperadas en '$Database': $($notLoaded -join ', '). No se ejecutó ninguna migración."
    }

    return [pscustomobject]@{
        Database = $Database
        Migrations = $migrations
        Applied = @($migrations | Where-Object Applied)
        Pending = @($migrations | Where-Object { -not $_.Applied })
        Schema = $schema
    }
}

function Invoke-BioNexusMigrationRun {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Database
    )

    $values = @{}
    foreach ($key in $script:adminEnvironment.Keys) {
        $values[$key] = $script:adminEnvironment[$key]
    }
    $values['DB_DATABASE'] = $Database
    $previous = Set-BioNexusProcessEnvironment -Values $values
    try {
        Push-Location $script:BioNexusBackendRoot
        try {
            & npm run migration:run
            if ($LASTEXITCODE -ne 0) {
                throw "La ejecución de migraciones falló para '$Database' con código $LASTEXITCODE."
            }
        }
        finally {
            Pop-Location
        }
    }
    finally {
        Restore-BioNexusProcessEnvironment -Values $previous
    }
}

try {
    $migrationDirectory = Join-Path $script:BioNexusBackendRoot 'src\database\migrations'
    $uncommittedMigrations = & git -C $script:BioNexusBackendRoot status --porcelain -- 'src/database/migrations'
    if ($LASTEXITCODE -ne 0) {
        throw 'No pude verificar el estado Git de las migraciones.'
    }
    if ($uncommittedMigrations) {
        throw 'Hay cambios de migraciones sin commit. Prueba y compromete el código de migración antes de usar este script.'
    }
    if (-not (Test-Path -LiteralPath $migrationDirectory -PathType Container)) {
        throw "No existe la carpeta de migraciones: $migrationDirectory"
    }

    $script:adminEnvironment = Get-BioNexusBackendEnvironment -EnvironmentFile (Join-Path $script:BioNexusBackendRoot '.env')
    Assert-BioNexusRequiredValues -Environment $script:adminEnvironment -Names @(
        'DB_HOST',
        'DB_PORT',
        'DB_USER',
        'DB_PASSWORD'
    )

    if ($WhatIfPreference -and $EnvironmentName -eq 'Development') {
        Write-BioNexusLog "Consultando migration:show y SchemaReadiness de '$targetDatabase' en modo de solo lectura."
        $status = Get-BioNexusMigrationStatus -Database $targetDatabase
        $appliedNames = @($status.Applied | ForEach-Object { $_.Name })
        $pendingNames = @($status.Pending | ForEach-Object { $_.Name })
        Write-BioNexusLog "Migraciones aplicadas en '$targetDatabase' ($($appliedNames.Count)): $($appliedNames -join ', ')" 'OK'
        if ($pendingNames.Count -gt 0) {
            Write-BioNexusLog "Migraciones pendientes en '$targetDatabase' ($($pendingNames.Count)): $($pendingNames -join ', ')" 'WARN'
        }
        else {
            Write-BioNexusLog "No hay migraciones pendientes en '$targetDatabase'." 'OK'
        }
        if ($status.Schema.ready) {
            Write-BioNexusLog "SchemaReadiness de '$targetDatabase': READY." 'OK'
        }
        else {
            Write-BioNexusLog "SchemaReadiness de '$targetDatabase': NOT READY. Hallazgos: $($status.Schema.issues -join ', ')" 'WARN'
        }
        Write-BioNexusLog 'Consulta read-only completada. No se ejecutó migration:run ni se modificó ninguna base.' 'WARN'
        return
    }
    $action = if ($EnvironmentName -eq 'Development') {
        "Apply committed migrations to local development database '$targetDatabase'"
    } else {
        "Promote migrations already applied in development to local rehearsal database '$targetDatabase'"
    }
    if (-not $PSCmdlet.ShouldProcess($targetDatabase, $action)) {
        Write-BioNexusLog 'No se consultó ni modificó ninguna base.' 'WARN'
        return
    }

    if ($EnvironmentName -eq 'Development') {
        $status = Get-BioNexusMigrationStatus -Database $targetDatabase
        if ($status.Pending.Count -eq 0) {
            Assert-BioNexusSchemaReady -State $status.Schema -Database $targetDatabase
            Write-BioNexusLog "No hay migraciones pendientes en '$targetDatabase'." 'OK'
            return
        }

        Write-BioNexusLog "Migraciones pendientes en '$targetDatabase': $($status.Pending.Name -join ', ')" 'WARN'
        Invoke-BioNexusMigrationRun -Database $targetDatabase
        $verified = Get-BioNexusMigrationStatus -Database $targetDatabase
        if ($verified.Pending.Count -gt 0) {
            throw "Después de ejecutar, siguen pendientes migraciones en '$targetDatabase': $($verified.Pending.Name -join ', ')."
        }
        Assert-BioNexusSchemaReady -State $verified.Schema -Database $targetDatabase
        Write-BioNexusLog "Todas las migraciones quedaron aplicadas y verificadas en '$targetDatabase'." 'OK'
        return
    }

    Write-BioNexusLog 'Este comando solo afecta bionexus_prod en el PostgreSQL local; no configura ni migra Railway.' 'WARN'
    $development = Get-BioNexusMigrationStatus -Database $targets.Development
    if ($development.Pending.Count -gt 0) {
        throw "Primero aplica y valida las migraciones en '$($targets.Development)'. Pendientes: $($development.Pending.Name -join ', ')."
    }
    Assert-BioNexusSchemaReady -State $development.Schema -Database $targets.Development

    $production = Get-BioNexusMigrationStatus -Database $targetDatabase
    if ($production.Pending.Count -eq 0) {
        Assert-BioNexusSchemaReady -State $production.Schema -Database $targetDatabase
        Write-BioNexusLog "No hay migraciones pendientes en '$targetDatabase'." 'OK'
        return
    }

    $developmentNames = @{}
    foreach ($migration in $development.Applied) {
        $developmentNames[$migration.Name] = $true
    }
    $notValidated = @($production.Pending | Where-Object {
        -not $developmentNames.ContainsKey($_.Name)
    })
    if ($notValidated.Count -gt 0) {
        throw "La base de ensayo tiene migraciones no aplicadas en development: $($notValidated.Name -join ', '). No se modificó '$targetDatabase'."
    }

    Write-BioNexusLog "Migraciones validadas en development y pendientes en '$targetDatabase': $($production.Pending.Name -join ', ')" 'WARN'
    $confirmation = Read-Host "Para aplicar solo a la base local '$targetDatabase', escribe exactamente MIGRAR bionexus_prod"
    if ($confirmation -cne 'MIGRAR bionexus_prod') {
        throw "Confirmación incorrecta. No se modificó '$targetDatabase'."
    }

    Invoke-BioNexusMigrationRun -Database $targetDatabase
    $verified = Get-BioNexusMigrationStatus -Database $targetDatabase
    if ($verified.Pending.Count -gt 0) {
        throw "Después de ejecutar, siguen pendientes migraciones en '$targetDatabase': $($verified.Pending.Name -join ', ')."
    }
    Assert-BioNexusSchemaReady -State $verified.Schema -Database $targetDatabase
    Write-BioNexusLog "La promoción de migraciones a '$targetDatabase' terminó y se verificó correctamente." 'OK'
}
catch {
    Write-BioNexusLog $_.Exception.Message 'ERROR'
    exit 1
}
finally {
    if ($script:adminEnvironment) {
        $script:adminEnvironment['DB_PASSWORD'] = $null
    }
}
