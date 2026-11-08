[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param([string]$OutputDirectory)
. (Join-Path $PSScriptRoot 'BioNexus-Operations.Common.ps1')
Write-BioNexusMessage INFO 'Promocion local: esquema y seeds versionados; no copia datos transaccionales de Development.'
if (-not $PSCmdlet.ShouldProcess('bionexus_prod', 'Respaldar Production y aplicar migraciones committed')) {
    Write-BioNexusMessage WARN 'No se consulto ni modifico ninguna base.'; return
}
$typed = Read-Host "Escribe exactamente PROMOVER bionexus_prod"
if ($typed -cne 'PROMOVER bionexus_prod') {
    throw 'Confirmacion textual incorrecta.'
}
& (Join-Path $PSScriptRoot 'Test-BioNexus-Ready.ps1'); if ($LASTEXITCODE -ne 0) {
    throw 'La validacion de preparacion fallo.'
}
& (Join-Path $PSScriptRoot 'Backup-BioNexus-Environment.ps1') -EnvironmentName Production -OutputDirectory $OutputDirectory -Confirm:$false; if ($LASTEXITCODE -ne 0) {
    throw 'El respaldo de Production fallo.'
}
& (Join-Path $PSScriptRoot 'Invoke-BioNexus-Migrations.ps1') -EnvironmentName Production -Confirm:$false; if ($LASTEXITCODE -ne 0) {
    throw 'La migracion de Production fallo.'
}
Write-BioNexusMessage OK 'Promocion local completada y validada por las herramientas especializadas.'
