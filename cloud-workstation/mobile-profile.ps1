# DEXTER NEXUS MOBILE PROFILE — Linux PowerShell 7.
# This profile improves navigation, diagnostics, and low-bandwidth terminals.
# It does not modify iOS, use jailbreaks, or run commands without user input.
if (Get-Module -ListAvailable PSReadLine) {
    try {
        Set-PSReadLineOption -PredictionSource None -BellStyle None -ErrorAction Stop
    } catch {
        # Profiles must never prevent an interactive shell from starting.
    }
}
function nexus-help {
    @(
        'DEXTER NEXUS | Comandos para iPhone'
        '  nexus-help     Muestra la ayuda'
        '  nexus-repo     Abre la carpeta del proyecto'
        '  nexus-status   Estado del entorno y Git'
        '  nexus-recent   Últimos cambios del repositorio'
        '  nexus-files    Archivos del directorio actual'
        '  nexus-ai       Buscar proveedores públicos de IA (ej.: nexus-ai Groq)'
        '  opencode       Abre el cliente de OpenCode (requiere modelo configurado)'
        '  Ctrl+C        Interrumpe la ejecución actual'
        ''
        'Nota: es PowerShell 7 sobre Linux remoto, no un jailbreak ni Windows.'
    ) -join [Environment]::NewLine
}
function nexus-repo {
    $path = '/workspace/dexter-ai-web'
    if (-not (Test-Path -LiteralPath $path -PathType Container)) {
        Write-Warning "El proyecto todavía no está disponible en $path."
        return
    }
    Set-Location -LiteralPath $path
    Get-Location
}
function nexus-files {
    Get-ChildItem -Force | Select-Object Mode, Length, Name
}
function nexus-status {
    Write-Output ("PowerShell: {0} | OS: {1}" -f $PSVersionTable.PSVersion, [System.Runtime.InteropServices.RuntimeInformation]::OSDescription)
    Write-Output ("Ruta: {0}" -f (Get-Location).Path)
    $repo = '/workspace/dexter-ai-web'
    if ((Test-Path -LiteralPath (Join-Path $repo '.git')) -and (Get-Command git -ErrorAction SilentlyContinue)) {
        & git -C $repo status --short --branch
    } else {
        Write-Output 'Repositorio: no descargado. Prueba nexus-repo cuando esté disponible.'
    }
    foreach ($tool in @('git', 'node', 'opencode')) {
        $cmd = Get-Command $tool -ErrorAction SilentlyContinue
        Write-Output ("{0}: {1}" -f $tool, $(if ($cmd) { 'instalado' } else { 'no disponible' }))
    }
}
function nexus-recent {
    $repo = '/workspace/dexter-ai-web'
    if (-not (Test-Path -LiteralPath (Join-Path $repo '.git'))) {
        Write-Warning 'No se ha descargado el repositorio.'
        return
    }
    & git -C $repo log -5 --pretty=format:'%h %s'
    Write-Output ''
}

function nexus-ai {
    param([string]$Buscar = '')
    $catalogPath = '/workspace/dexter-ai-web/nexus-os/ai-apis/catalog.json'
    if (-not (Test-Path -LiteralPath $catalogPath -PathType Leaf)) {
        Write-Warning 'No se encontró el catálogo. Prueba nexus-repo o consulta NEXUS AI API HUB en tu navegador.'
        return
    }
    try {
        $data = Get-Content -LiteralPath $catalogPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
    } catch {
        Write-Warning 'No se pudo leer el catálogo de proveedores públicos.'
        return
    }
    $providers = @($data.providers)
    if ($Buscar.Trim()) {
        $text = [regex]::Escape($Buscar.Trim())
        $providers = @($providers | Where-Object {
            $_.name -match $text -or $_.baseURL -match $text
        })
    }
    if (-not $providers.Count) {
        Write-Output 'No se encontraron proveedores con ese nombre.'
        return
    }
    $providers | Select-Object -Property name, freeModels, baseURL, keyUrl | Format-Table -AutoSize -Wrap
    Write-Output 'Catálogo público. Necesitas una clave válida del proveedor para ejecutar solicitudes.'
    Write-Output 'Directorio completo: https://freellm.net/models/'
}
