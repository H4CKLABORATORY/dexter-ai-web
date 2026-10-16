# NEXUS WINDOWS BRIDGE - ChatGPT Desktop bootstrap
# Windows 10 build >= 17763 or Windows 11.
# Open this file and review it before running. No passwords or tokens required.
# This script installs only the official Microsoft Store ChatGPT app.
# It never installs remote-control agents silently or opens firewall ports.
$ErrorActionPreference = "Stop"
function Say($message) { Write-Host "[NEXUS] $message" -ForegroundColor Cyan }

Say "Checking Windows version..."
if ($env:OS -ne "Windows_NT") {
  Write-Error "This installer must be run inside a real Windows computer or VM."
  exit 2
}
$os = Get-CimInstance -ClassName Win32_OperatingSystem
$version = [System.Environment]::OSVersion.Version
if ($version.Build -lt 17763) {
  Write-Error "ChatGPT for Windows requires Windows 10 build 17763 or newer."
  exit 3
}
Say ("Windows detected: " + $os.Caption + " (build " + $version.Build + ")")

$storeUrl = "ms-windows-store://pdp/?ProductId=9NT1R1C2HH7J"
$download = "https://chatgpt.com/download/"
$remote = "https://www.dwservice.net/es/"

Say "Checking Windows Package Manager..."
$winget = Get-Command winget.exe -ErrorAction SilentlyContinue
if ($winget) {
  try {
    Say "Installing ChatGPT (Microsoft Store ID 9NT1R1C2HH7J)..."
    & winget.exe install --id 9NT1R1C2HH7J --source msstore --accept-package-agreements --accept-source-agreements --silent
    if ($LASTEXITCODE -ne 0) {
      Say "Automatic Microsoft Store installation returned exit code $LASTEXITCODE."
      Say "You can finish installing from the official Microsoft Store."
      Start-Process $storeUrl
    } else {
      Say "Installer command completed; confirm ChatGPT launches before signing in."
    }
  }
  catch {
    Say ("winget could not finish: " + $_.Exception.Message)
    Say "Opening the official ChatGPT download page."
    Start-Process $download
  }
} else {
  Say "winget is not available. Opening the official Microsoft Store page."
  try { Start-Process $storeUrl }
  catch { Start-Process $download }
}

Say "Remote-access setup is a separate, manual step."
Say "Open DWService in your browser and download DWAgent ONLY if you trust this remote-access provider."
Say "Install DWAgent on THIS Windows machine, add it to YOUR DWService account, and enable MFA."
Say "A remote agent can control your entire computer: do not share your access details."
Say "When connected from the iPhone, open the ChatGPT Windows app and log in yourself."
Say "Opening provider instructions..."
Start-Process $remote
Say "Done. NEXUS OS cannot see your ChatGPT password or manage remote sessions from this script."
