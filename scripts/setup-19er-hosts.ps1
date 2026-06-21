# Maps 19er.local to localhost for local dev. Run as Administrator.
# Note: do not use 19er.app — the .app TLD is HSTS-preloaded and browsers force HTTPS.
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$entry = "127.0.0.1`t19er.local"

if (Select-String -Path $hostsPath -Pattern "19er\.local" -Quiet) {
    Write-Host "Hosts entry for 19er.local already exists."
    exit 0
}

try {
    Add-Content -Path $hostsPath -Value "`n$entry"
    Write-Host "Added: $entry"
    Write-Host "Open http://19er.local:5173 (or the port Vite prints if 5173 is busy)."
} catch {    Write-Host "Could not write to hosts file. Run this script as Administrator:" -ForegroundColor Red
    Write-Host "  Right-click PowerShell -> Run as administrator"
    Write-Host "  cd $PSScriptRoot\.."
    Write-Host "  pnpm setup:hosts"
    exit 1
}
