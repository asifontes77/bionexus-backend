$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'BioNexus-Operations.Common.ps1')

$source = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'Invoke-BioNexus-Migrations.ps1') -Raw
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$errors)
if ($errors.Count -gt 0) { throw 'El script de migraciones no se pudo analizar.' }
$function = $ast.Find({
    param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
        $node.Name -eq 'Get-BioNexusMigrationStatus'
}, $true)
Invoke-Expression $function.Extent.Text
$script:BioNexusBackendRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path

$script:adminEnvironment = @{ DB_DATABASE = 'unused' }
$script:probeCount = 0
function Set-BioNexusProcessEnvironment {
    param([hashtable]$Values)
    $previous = @{}
    foreach ($key in $Values.Keys) {
        $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
        [Environment]::SetEnvironmentVariable($key, [string]$Values[$key], 'Process')
    }
    return $previous
}
function Restore-BioNexusProcessEnvironment {
    param([hashtable]$Values)
    foreach ($key in $Values.Keys) {
        [Environment]::SetEnvironmentVariable($key, $Values[$key], 'Process')
    }
}
function Get-BioNexusSchemaReadiness {
    param([string]$Database)
    if ($env:DB_DATABASE -ne $Database) { throw 'La consulta no usa la base seleccionada.' }
    $script:probeCount++
    return [pscustomobject]@{ ready = $true; issues = @() }
}
function npm {
    $global:LASTEXITCODE = 0
    return $script:showOutput
}
function Assert-True([bool]$Value, [string]$Message) {
    if (-not $Value) { throw $Message }
}

$script:showOutput = @(
    '[X] 1 BioNexusBaseline1790366400000',
    '[ ] AddPlatformLaboratoryLifecycle1793847600000',
    '[ ] AddPlatformSubscriptionCatalogAndBilling1793862000000',
    '[ ] AddCommercialPlanModel1793862001000'
)
$status = Get-BioNexusMigrationStatus -Database 'bionexus_dev'
Assert-True ($status.Pending.Count -eq 3) 'TypeORM debe reconocer migraciones pendientes sin numero.'
Assert-True ($status.Applied.Count -eq 1) 'No se reconocio la baseline aplicada.'
Assert-True ($script:probeCount -eq 1) 'No se consulto el esquema despues de migration:show.'

$script:showOutput = @(
    '[X] 1 BioNexusBaseline1790366400000',
    '[X] 2 AddPlatformLaboratoryLifecycle1793847600000',
    '[X] 3 AddPlatformSubscriptionCatalogAndBilling1793862000000',
    '[X] 4 AddCommercialPlanModel1793862001000'
)
$status = Get-BioNexusMigrationStatus -Database 'bionexus_dev'
Assert-True ($status.Pending.Count -eq 0) 'No se reconocieron todas las migraciones aplicadas.'

$script:showOutput = @('[X] 1 BioNexusBaseline1790366400000')
$failed = $false
try { $null = Get-BioNexusMigrationStatus -Database 'bionexus_dev' }
catch { $failed = $_.Exception.Message -match 'no cargó las migraciones esperadas' }
Assert-True $failed 'Una migracion no cargada debe bloquear el estado listo.'

$script:showOutput = @('No migrations found')
$failed = $false
try { $null = Get-BioNexusMigrationStatus -Database 'bionexus_dev' }
catch { $failed = $_.Exception.Message -match 'no cargó las migraciones esperadas' }
Assert-True $failed 'Una lista vacia debe indicar migraciones no cargadas.'

$failed = $false
try {
    Assert-BioNexusSchemaReady -Database 'bionexus_dev' -State ([pscustomobject]@{
        ready = $false; issues = @('public.platform_subscription_plans')
    })
} catch { $failed = $_.Exception.Message -match 'platform_subscription_plans' }
Assert-True $failed 'Un esquema incompleto debe bloquear el estado listo.'

$main = @($ast.EndBlock.Statements | Where-Object {
    $_ -is [System.Management.Automation.Language.TryStatementAst]
})[0].Body.Extent.Text
Invoke-Expression ("function Invoke-MockedMigrationWorkflow { [CmdletBinding(SupportsShouldProcess=`$true)] param([string]`$EnvironmentName) `n" +
    "`$targets = @{ Development = 'bionexus_dev'; Production = 'bionexus_prod' }`n" +
    "`$targetDatabase = `$targets[`$EnvironmentName]`n" + $main.Substring(1, $main.Length - 2) + "`n}")

function git { $global:LASTEXITCODE = 0 }
function Get-BioNexusBackendEnvironment {
    return @{ DB_HOST = 'mock'; DB_PORT = '1'; DB_USER = 'mock'; DB_PASSWORD = 'mock' }
}
function Write-BioNexusLog { param($Message, $Level) $script:logs += $Message }
function Get-BioNexusMigrationStatus {
    param([string]$Database)
    if ($script:states.Count -eq 0) { throw 'Unexpected status request.' }
    $result = $script:states[0]
    $script:states = @($script:states | Select-Object -Skip 1)
    return $result
}
function Invoke-BioNexusMigrationRun { param([string]$Database) $script:runs++ }
function New-Status([bool]$Ready, [bool]$Pending) {
    $pendingMigrations = if ($Pending) { @([pscustomobject]@{ Name = 'pending' }) } else { @() }
    return [pscustomobject]@{
        Pending = @($pendingMigrations)
        Applied = @()
        Schema = [pscustomobject]@{ ready = $Ready; issues = @('public.platform_subscription_plans') }
    }
}

$script:logs = @()
$script:runs = 0
$script:states = @((New-Status $false $false))
$failed = $false
try { Invoke-MockedMigrationWorkflow -EnvironmentName Development -Confirm:$false }
catch { $failed = $_.Exception.Message -match 'platform_subscription_plans' }
Assert-True ($failed -and $script:runs -eq 0 -and $script:logs.Count -eq 0) 'Cero pendientes con esquema incompleto debe fallar sin declarar exito.'

$script:logs = @()
$script:runs = 0
$script:states = @((New-Status $false $true), (New-Status $true $false))
Invoke-MockedMigrationWorkflow -EnvironmentName Development -Confirm:$false
Assert-True ($script:runs -eq 1 -and $script:states.Count -eq 0 -and $script:logs.Count -eq 2) 'La migracion pendiente debe ejecutarse y verificarse despues.'

$script:logs = @()
$script:runs = 0
$script:states = @((New-Status $false $true), (New-Status $false $false))
$failed = $false
try { Invoke-MockedMigrationWorkflow -EnvironmentName Development -Confirm:$false }
catch { $failed = $_.Exception.Message -match 'platform_subscription_plans' }
Assert-True ($failed -and $script:runs -eq 1 -and $script:logs.Count -eq 1) 'El esquema incompleto tras migrar no debe declarar exito.'

$script:logs = @()
$script:runs = 0
$script:states = @((New-Status $false $false))
$failed = $false
try { Invoke-MockedMigrationWorkflow -EnvironmentName Production -Confirm:$false }
catch { $failed = $_.Exception.Message -match 'platform_subscription_plans' }
Assert-True ($failed -and $script:runs -eq 0) 'No debe promoverse si development tiene esquema incompleto.'
Write-Host 'Migration status unit tests: PASS'


$migrationScriptContent = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'Invoke-BioNexus-Migrations.ps1') -Raw
$readOnlyMarker = '$WhatIfPreference -and $EnvironmentName -eq ''Development'''
$readOnlyPosition = $migrationScriptContent.IndexOf($readOnlyMarker)
$shouldProcessPosition = $migrationScriptContent.IndexOf('$PSCmdlet.ShouldProcess')
$runPosition = $migrationScriptContent.IndexOf('Invoke-BioNexusMigrationRun -Database $targetDatabase')
if ($readOnlyPosition -lt 0 -or $shouldProcessPosition -lt 0 -or $runPosition -lt 0) { throw 'No se localizaron los contratos de consulta y ejecución de migraciones.' }
if ($readOnlyPosition -gt $shouldProcessPosition) { throw 'La consulta read-only debe ejecutarse antes de ShouldProcess.' }
if ($runPosition -lt $shouldProcessPosition) { throw 'migration:run debe permanecer detrás de ShouldProcess.' }
foreach ($expected in @('Consultando migration:show', 'Consulta read-only completada', 'SchemaReadiness', 'No se ejecutó migration:run')) {
    if ($migrationScriptContent -notlike "*$expected*") { throw "Falta el contrato de simulación read-only: $expected" }
}
