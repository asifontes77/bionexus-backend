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

function Get-BioNexusSchemaReadiness {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Database,
        [string]$Role = ''
    )

    $probe = Join-Path $PSScriptRoot 'BioNexus-SchemaReadiness.cjs'
    Push-Location $script:BioNexusBackendRoot
    try {
        $output = & node $probe $Database $Role
        if ($LASTEXITCODE -ne 0) {
            throw "No pude verificar el esquema de '$Database' en modo de solo lectura."
        }
        return ($output | ConvertFrom-Json)
    }
    finally {
        Pop-Location
    }
}

function Assert-BioNexusSchemaReady {
    param(
        [Parameter(Mandatory = $true)]
        $State,
        [Parameter(Mandatory = $true)]
        [string]$Database
    )
    if (-not $State.ready) {
        throw "Esquema o historial incompleto en '$Database': $($State.issues -join ', '). No se declaró listo."
    }
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

$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$global:OutputEncoding = [Console]::OutputEncoding
try {
    & chcp.com 65001 > $null
}
catch {
}

function Write-BioNexusMessage {
    param([ValidateSet('INFO', 'OK', 'WARN', 'ERROR')][string]$Level, [string]$Message)
    $color = @{INFO = 'Cyan'; OK = 'Green'; WARN = 'Yellow'; ERROR = 'Red' }[$Level]
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message" -ForegroundColor $color
}
function Get-BioNexusDesktop {
    $desktop = [Environment]::GetFolderPath([Environment+SpecialFolder]::Desktop)
    if ([string]::IsNullOrWhiteSpace($desktop)) {
        throw 'Windows no pudo resolver el Escritorio del usuario actual.'
    }
    return $desktop
}
function Get-BioNexusDefaultBackupDirectory {
    Join-Path (Get-BioNexusDesktop) 'BioNexus Backup'
}
function Assert-BioNexusEnvironment([string]$EnvironmentName) {
    if ($EnvironmentName -notin @('Development', 'Production')) {
        throw "Entorno no permitido: $EnvironmentName"
    }
    if ($EnvironmentName -eq 'Development') {
        'bionexus_dev'
    }
    else {
        'bionexus_prod'
    }
}
function Assert-BioNexusPathOutsideGit([string]$Path, [string]$BackendRoot) {
    $resolved = [IO.Path]::GetFullPath($Path).TrimEnd('\\')
    $repo = [IO.Path]::GetFullPath($BackendRoot).TrimEnd('\\')
    $parent = [IO.Path]::GetFullPath((Split-Path $BackendRoot -Parent)).TrimEnd('\\')
    if ($resolved.StartsWith($repo, [StringComparison]::OrdinalIgnoreCase) -or $resolved.StartsWith($parent, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'La carpeta de respaldo no puede estar dentro de los repositorios de Bio Nexus.'
    }
}
function Find-BioNexusPostgresTool([string]$Name) {
    $cmd = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }
    foreach ($root in @('C:\Program Files\PostgreSQL', 'C:\Program Files (x86)\PostgreSQL')) {
        if (Test-Path $root) {
            $found = Get-ChildItem $root -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object { Join-Path $_.FullName "bin\$Name.exe" } | Where-Object { Test-Path $_ } | Select-Object -First 1
            if ($found) {
                return $found
            }
        }
    }
    throw "No se encontro $Name.exe."
}
function Get-BioNexusDatabaseUrl([string]$BackendRoot, [string]$DatabaseName) {
    foreach ($file in @('.env', '.env.development', '.env.local')) {
        $path = Join-Path $BackendRoot $file
        if (Test-Path $path) {
            foreach ($line in Get-Content $path -Encoding UTF8) {
                if ($line -match '^\s*(DATABASE_URL|BIONEXUS_DATABASE_URL)\s*=\s*(.+?)\s*$') {
                    $value = $Matches[2].Trim().Trim('"').Trim("'")
                    try {
                        $uri = [Uri]$value
                    }
                    catch {
                        continue
                    }
                    if ($uri.AbsolutePath.TrimStart('/') -eq $DatabaseName) {
                        return $value
                    }
                }
            }
        }
    }
    foreach ($name in @('DATABASE_URL', 'BIONEXUS_DATABASE_URL')) {
        $value = [Environment]::GetEnvironmentVariable($name, 'Process')
        if ($value) {
            $uri = [Uri]$value; if ($uri.AbsolutePath.TrimStart('/') -eq $DatabaseName) {
                return $value
            }
        }
    }
    throw "No se encontro una conexion administrativa para $DatabaseName."
}
