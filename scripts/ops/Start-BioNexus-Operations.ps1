[CmdletBinding()]
param()
. (Join-Path $PSScriptRoot 'BioNexus-Operations.Common.ps1')
function Run([string]$File, [hashtable]$Arguments = @{}) {
    & (Join-Path $PSScriptRoot $File) @Arguments; if ($LASTEXITCODE -ne 0) {
        Write-BioNexusMessage ERROR "La operacion fallo con codigo $LASTEXITCODE."
    }
}

function Select-BioNexusBackupDirectory {
    $defaultDirectory = Get-BioNexusDefaultBackupDirectory
    Write-Host ''
    Write-Host "Destino predeterminado detectado: $defaultDirectory" -ForegroundColor Cyan
    Write-Host '1. Usar destino predeterminado'
    Write-Host '2. Especificar otra carpeta absoluta'
    Write-Host '0. Cancelar'
    $destinationChoice = (Read-Host 'Selecciona el destino del respaldo').Trim()
    switch ($destinationChoice) {
        '1' { return $defaultDirectory }
        '2' {
            $customDirectory = (Read-Host 'Escribe la ruta absoluta de la carpeta').Trim().Trim('"')
            if ([string]::IsNullOrWhiteSpace($customDirectory)) { throw 'La ruta alternativa no puede estar vacia.' }
            if (-not [System.IO.Path]::IsPathRooted($customDirectory)) { throw 'La ruta alternativa debe ser absoluta.' }
            return [System.IO.Path]::GetFullPath($customDirectory)
        }
        '0' { return $null }
        default { throw 'Seleccion de destino no valida.' }
    }
}
function Run-BioNexusDevelopmentBackup {
    param([switch]$WhatIfMode)
    $outputDirectory = Select-BioNexusBackupDirectory
    if ([string]::IsNullOrWhiteSpace($outputDirectory)) {
        Write-BioNexusMessage WARN 'Operacion de respaldo cancelada por el usuario.'
        return
    }
    $arguments = @{ EnvironmentName = 'Development'; OutputDirectory = $outputDirectory }
    if ($WhatIfMode) { $arguments['WhatIf'] = $true } else { $arguments['Confirm'] = $true }
    Run 'Backup-BioNexus-Environment.ps1' $arguments
}
do {
    cls; Write-Host 'BIO NEXUS - HERRAMIENTAS OPERATIVAS' -ForegroundColor Cyan
    Write-Host '1. Validar preparacion del codigo'; Write-Host '2. Simular respaldo Development'; Write-Host '3. Crear respaldo Development'; Write-Host '4. Simular migraciones Development'; Write-Host '5. Aplicar migraciones Development'; Write-Host '6. Instalar entorno limpio permitido'; Write-Host '7. Simular promocion a Production local'; Write-Host '8. Promover esquema a Production local'; Write-Host '0. Salir'
    $choice = Read-Host 'Selecciona una opcion'
    switch ($choice) {
        '1' {
            Run 'Test-BioNexus-Ready.ps1'
        }
        '2' {
            Run-BioNexusDevelopmentBackup -WhatIfMode
        }
        '3' {
            Run-BioNexusDevelopmentBackup
        }
        '4' {
            Run 'Invoke-BioNexus-Migrations.ps1' @{EnvironmentName = 'Development'; WhatIf = $true }
        }
        '5' {
            Run 'Invoke-BioNexus-Migrations.ps1' @{EnvironmentName = 'Development'; Confirm = $true }
        }
        '6' {
            $envChoice = Read-Host 'Entorno limpio: Development o Production'; Run 'Install-BioNexus-Environment.ps1' @{EnvironmentName = $envChoice; Confirm = $true }
        }
        '7' {
            Run 'Promote-BioNexus-Database.ps1' @{WhatIf = $true }
        }
        '8' {
            Run 'Promote-BioNexus-Database.ps1' @{Confirm = $true }
        }
        '0' {
            break
        }
        default {
            Write-BioNexusMessage WARN 'Opcion invalida.'
        }
    }
    if ($choice -ne '0') {
        Read-Host 'Presiona Enter para volver al menu' | Out-Null
    }
}while ($choice -ne '0')
