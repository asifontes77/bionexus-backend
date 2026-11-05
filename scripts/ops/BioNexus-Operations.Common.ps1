Set-StrictMode -Version Latest

$script:BioNexusBackendRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$script:BioNexusWorkspaceRoot = Split-Path -Parent $script:BioNexusBackendRoot
$script:BioNexusFrontendRoot = Join-Path $script:BioNexusWorkspaceRoot 'Bio Nexus Frontend'

function Write-BioNexusLog {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,

        [ValidateSet('INFO', 'OK', 'WARN', 'ERROR')]
        [string]$Level = 'INFO'
    )

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $color = switch ($Level) {
        'OK' { 'Green' }
        'WARN' { 'Yellow' }
        'ERROR' { 'Red' }
        default { 'Cyan' }
    }

    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Get-BioNexusBackendEnvironment {
    param(
        [Parameter(Mandatory = $true)]
        [string]$EnvironmentFile
    )

    if (-not (Test-Path -LiteralPath $EnvironmentFile -PathType Leaf)) {
        throw "No existe la configuración local requerida: $EnvironmentFile"
    }

    $parser = @'
const fs = require('node:fs');
const dotenv = require('dotenv');
const file = process.argv[1];
process.stdout.write(JSON.stringify(dotenv.parse(fs.readFileSync(file))));
'@

    Push-Location $script:BioNexusBackendRoot
    try {
        $json = & node -e $parser $EnvironmentFile
        if ($LASTEXITCODE -ne 0) {
            throw 'No fue posible leer la configuración local del Backend.'
        }
    }
    finally {
        Pop-Location
    }

    $parsed = $json | ConvertFrom-Json
    $values = @{}
    foreach ($property in $parsed.PSObject.Properties) {
        $values[$property.Name] = [string]$property.Value
    }

    return $values
}

function Set-BioNexusProcessEnvironment {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Values
    )

    $previous = @{}
    foreach ($name in $Values.Keys) {
        $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
        [Environment]::SetEnvironmentVariable($name, [string]$Values[$name], 'Process')
    }

    return $previous
}

function Restore-BioNexusProcessEnvironment {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Values
    )

    foreach ($name in $Values.Keys) {
        [Environment]::SetEnvironmentVariable($name, $Values[$name], 'Process')
    }
}

function Assert-BioNexusRequiredValues {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Environment,

        [Parameter(Mandatory = $true)]
        [string[]]$Names
    )

    $missing = @($Names | Where-Object {
        -not $Environment.ContainsKey($_) -or [string]::IsNullOrWhiteSpace([string]$Environment[$_])
    })

    if ($missing.Count -gt 0) {
        throw "Faltan variables requeridas en el .env local: $($missing -join ', '). No se imprimieron valores."
    }
}

function Assert-BioNexusPortAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port,

        [Parameter(Mandatory = $true)]
        [string]$ServiceName
    )

    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if ($listener) {
        $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
        $processName = if ($process) { $process.ProcessName } else { 'proceso desconocido' }
        throw "El puerto $Port ($ServiceName) ya está ocupado por PID $($listener.OwningProcess), $processName. No detuve ningún proceso."
    }
}

function Invoke-BioNexusNodeJson {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Code
    )

    $output = & node -e $Code
    if ($LASTEXITCODE -ne 0) {
        throw 'Falló una comprobación local de PostgreSQL. Revisa el error del comando sin compartir credenciales.'
    }

    return ($output | ConvertFrom-Json)
}

function Start-BioNexusConsole {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,

        [Parameter(Mandatory = $true)]
        [string]$Command,

        [Parameter(Mandatory = $true)]
        [hashtable]$Environment
    )

    $powershellExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    if (-not (Test-Path -LiteralPath $powershellExe -PathType Leaf)) {
        throw "No se encontró Windows PowerShell en: $powershellExe"
    }

    $childCommand = "Set-Location -LiteralPath '$($WorkingDirectory.Replace("'", "''"))'`n$Command"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($childCommand))
    $previous = Set-BioNexusProcessEnvironment -Values $Environment

    try {
        return Start-Process -FilePath $powershellExe -ArgumentList @('-NoExit', '-EncodedCommand', $encoded) -PassThru
    }
    finally {
        Restore-BioNexusProcessEnvironment -Values $previous
    }
}
