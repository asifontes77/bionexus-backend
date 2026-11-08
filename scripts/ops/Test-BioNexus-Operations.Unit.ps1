$ErrorActionPreference = 'Stop'; $ops = $PSScriptRoot
foreach ($name in @('BioNexus-Operations.Common.ps1', 'Backup-BioNexus-Environment.ps1', 'Promote-BioNexus-Database.ps1', 'Start-BioNexus-Operations.ps1')) {
    if (-not(Test-Path (Join-Path $ops $name))) {
        throw "Falta $name"
    }; [void][scriptblock]::Create((Get-Content (Join-Path $ops $name)-Raw -Encoding UTF8))
}
$out = & (Join-Path $ops 'Backup-BioNexus-Environment.ps1') -EnvironmentName Development -WhatIf 2>&1 | Out-String

$backupScript = Join-Path $PSScriptRoot 'Backup-BioNexus-Environment.ps1'
$backupSource = Get-Content -LiteralPath $backupScript -Raw -Encoding UTF8
$backupTokens = $null
$backupParseErrors = $null
$backupAst = [System.Management.Automation.Language.Parser]::ParseInput(
    $backupSource,
    [ref]$backupTokens,
    [ref]$backupParseErrors
)

if ($backupParseErrors.Count -gt 0) {
    throw "El script de backup tiene errores de sintaxis: $($backupParseErrors.Message -join '; ')"
}

$cmdletBindingText = $backupAst.ParamBlock.Attributes.Extent.Text | Out-String
if ($cmdletBindingText -notmatch 'SupportsShouldProcess\s*=\s*\$true') {
    throw 'Contrato WhatIf ausente: SupportsShouldProcess=$true.'
}

$shouldProcessCalls = @(
    $backupAst.FindAll(
        {
            param($node)
            $node -is [System.Management.Automation.Language.InvokeMemberExpressionAst] -and
            $node.Member.Value -eq 'ShouldProcess'
        },
        $true
    )
)

$returnStatements = @(
    $backupAst.FindAll(
        {
            param($node)
            $node -is [System.Management.Automation.Language.ReturnStatementAst]
        },
        $true
    )
)

if ($shouldProcessCalls.Count -eq 0) {
    throw 'Contrato WhatIf ausente: llamada a $PSCmdlet.ShouldProcess(...).'
}

if ($returnStatements.Count -eq 0) {
    throw 'Contrato WhatIf ausente: salida mediante return.'
}

if ($backupSource -notmatch 'No se consulto ni modifico ninguna base\.') {
    throw 'Contrato WhatIf ausente: mensaje de no modificacion.'
}

if ($LASTEXITCODE -ne 0) {
    throw "La ejecucion WhatIf del backup termino con codigo $LASTEXITCODE."
}
$promote = & (Join-Path $ops 'Promote-BioNexus-Database.ps1') -WhatIf 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
    throw 'La simulacion WhatIf termino con codigo ' + $LASTEXITCODE
}
Write-Host 'Contratos de herramientas operativas aprobados.' -ForegroundColor Green
