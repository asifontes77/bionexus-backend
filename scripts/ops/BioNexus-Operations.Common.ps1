Set-StrictMode -Version Latest
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
