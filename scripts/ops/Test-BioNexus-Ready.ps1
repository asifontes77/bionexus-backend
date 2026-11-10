[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'BioNexus-Operations.Common.ps1')

function Invoke-BioNexusCheck {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,

        [Parameter(Mandatory = $true)]
        [string]$Executable,

        [string[]]$Arguments = @()
    )

    Write-BioNexusLog "Ejecutando: $Name"
    Push-Location $WorkingDirectory
    try {
        & $Executable @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Falló '$Name' con código $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }

    Write-BioNexusLog "${Name}: PASS" 'OK'
}

try {
    $backendLedger = Join-Path $script:BioNexusBackendRoot 'docs\BioNexus-Project-State.json'
    $frontendLedger = Join-Path $script:BioNexusFrontendRoot 'docs\BioNexus-Project-State.json'
    $backendBytes = [IO.File]::ReadAllBytes($backendLedger)
    $frontendBytes = [IO.File]::ReadAllBytes($frontendLedger)
    $backendHash = (Get-FileHash -LiteralPath $backendLedger -Algorithm SHA256).Hash
    $frontendHash = (Get-FileHash -LiteralPath $frontendLedger -Algorithm SHA256).Hash
    if ($backendHash -ne $frontendHash -or $backendBytes.Length -ne $frontendBytes.Length) {
        throw 'Las bitácoras Backend y Frontend no son idénticas. No continuaré con las comprobaciones.'
    }

    $null = Get-Content -LiteralPath $backendLedger -Raw | ConvertFrom-Json
    $null = Get-Content -LiteralPath $frontendLedger -Raw | ConvertFrom-Json
    Write-BioNexusLog "Bitácoras JSON válidas e idénticas. SHA-256: $backendHash" 'OK'

    Invoke-BioNexusCheck -Name 'Contrato tenant Frontend' -WorkingDirectory $script:BioNexusFrontendRoot -Executable 'node' -Arguments @('.\src\logic\tenantAccess.contract.spec.mjs')
    Invoke-BioNexusCheck -Name 'Pruebas tenant Backend' -WorkingDirectory $script:BioNexusBackendRoot -Executable 'npm' -Arguments @('test', '--', '--runInBand', 'laboratory/access-slug.spec.ts', 'users/tenant-host.spec.ts', 'users/users.service.login.spec.ts')
    Invoke-BioNexusCheck -Name 'Build Backend' -WorkingDirectory $script:BioNexusBackendRoot -Executable 'npm' -Arguments @('run', 'build')
    Invoke-BioNexusCheck -Name 'Build Frontend' -WorkingDirectory $script:BioNexusFrontendRoot -Executable 'npm' -Arguments @('run', 'build')

    foreach ($repository in @($script:BioNexusBackendRoot, $script:BioNexusFrontendRoot)) {
        & git -C $repository diff --check
        if ($LASTEXITCODE -ne 0) {
            throw "git diff --check falló en $repository."
        }
    }

    Write-BioNexusLog 'Todas las comprobaciones terminaron correctamente. No se conectó ni modificó ninguna base de datos.' 'OK'
}
catch {
    Write-BioNexusLog $_.Exception.Message 'ERROR'
    exit 1
}
