[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [Parameter(Mandatory)][ValidateSet('Development', 'Production')][string]$EnvironmentName,
    [string]$OutputDirectory
)
. (Join-Path $PSScriptRoot 'BioNexus-Operations.Common.ps1')
$backend = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$db = Assert-BioNexusEnvironment $EnvironmentName
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Get-BioNexusDefaultBackupDirectory
}
Assert-BioNexusPathOutsideGit $OutputDirectory $backend
Write-BioNexusMessage INFO "Entorno: $EnvironmentName | Base: $db | Destino: $OutputDirectory"
if (-not $PSCmdlet.ShouldProcess($db, "Crear respaldo SQL e inventario en '$OutputDirectory'")) {
    Write-BioNexusMessage WARN 'No se consulto ni modifico ninguna base.'; return
}
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$id = Get-Date -Format 'yyyyMMdd-HHmmss'; $summary = Join-Path $OutputDirectory "1-backup-$id.txt"; $log = Join-Path $OutputDirectory "2-backup-$id.log"; $sql = Join-Path $OutputDirectory "3-backup-$id.sql"
foreach ($path in @($summary, $log, $sql)) {
    if (Test-Path $path) {
        throw "El archivo ya existe: $path"
    }
}
$url = Get-BioNexusDatabaseUrl $backend $db; $pgDump = Find-BioNexusPostgresTool 'pg_dump'; $psql = Find-BioNexusPostgresTool 'psql'
& $pgDump --dbname=$url --format=plain --no-owner --no-privileges --file=$sql 2>&1 | Tee-Object -FilePath $log -Append
if ($LASTEXITCODE -ne 0 -or -not(Test-Path $sql) -or (Get-Item $sql).Length -le 0) {
    throw 'El respaldo SQL fallo o quedo vacio.'
}
$inventory = & $psql $url -v ON_ERROR_STOP=1 -Atc "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT 'migrations='||count(*) FROM migrations; SELECT 'laboratories='||count(*) FROM laboratory; SELECT 'plans='||count(*) FROM platform_subscription_plans; SELECT 'subscriptions='||count(*) FROM platform_subscriptions; COMMIT;" 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
    throw "Inventario read-only fallo: $inventory"
}
$hash = (Get-FileHash $sql -Algorithm SHA256).Hash; $size = (Get-Item $sql).Length
@("RESULTADO=OK", "ENTORNO=$EnvironmentName", "BASE=$db", "RESPALDO=$sql", "TAMANO=$size", "SHA256=$hash", 'INVENTARIO_READ_ONLY=OK', 'DATOS_MODIFICADOS=NO', '', $inventory) | Set-Content $summary -Encoding UTF8
Write-BioNexusMessage OK "Respaldo creado: $sql"; Write-BioNexusMessage OK "SHA-256: $hash"
