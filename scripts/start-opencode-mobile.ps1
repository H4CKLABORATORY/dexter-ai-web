# DEXTER NEXUS: inicia OpenCode protegido en el Codespace, no en el iPhone.
# Requiere GitHub Codespaces con .devcontainer/devcontainer.json.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (-not (Get-Command "opencode" -ErrorAction SilentlyContinue)) {
    throw "OpenCode no está instalado. Ejecuta: npm install -g opencode-ai"
}
$secure = Read-Host "Crea una contraseña de OpenCode (mínimo 16 caracteres)" -AsSecureString
$credentials = [pscredential]::new("opencode", $secure)
$password = $credentials.GetNetworkCredential().Password
if ($password.Length -lt 16) {
    throw "Contraseña muy corta. Debe tener 16 caracteres o más."
}
$env:OPENCODE_SERVER_USERNAME = "opencode"
$env:OPENCODE_SERVER_PASSWORD = $password
Remove-Variable password,secure,credentials -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "Servidor OpenCode protegido iniciándose en el puerto 4096." -ForegroundColor Cyan
Write-Host "En Codespaces abre PUERTOS y busca 4096."
Write-Host "La URL HTTPS aparece en PUERTOS cuando el servidor está activo."
Write-Host "Los puertos privados necesitan sesión GitHub, y algunas apps móviles no los pueden utilizar."
Write-Host "No hagas público el puerto si no necesitas conexión externa."
Write-Host "Para detener el servidor, presiona Ctrl+C."
try {
    & opencode serve --hostname 0.0.0.0 --port 4096
} finally {
    Remove-Item Env:OPENCODE_SERVER_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:OPENCODE_SERVER_USERNAME -ErrorAction SilentlyContinue
}
