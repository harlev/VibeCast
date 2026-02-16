#
# Install VibeCast external dependencies (yt-dlp, ffmpeg)
# Works on Windows via winget, with direct-download fallback.
#
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

# --- Helpers ---
function Write-Info    { param($msg) Write-Host "[info]  $msg" -ForegroundColor Cyan }
function Write-Ok      { param($msg) Write-Host "[ok]    $msg" -ForegroundColor Green }
function Write-Warn    { param($msg) Write-Host "[warn]  $msg" -ForegroundColor Yellow }
function Write-Err     { param($msg) Write-Host "[error] $msg" -ForegroundColor Red }

function Test-Command {
    param([string]$Name)
    $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

# --- Winget availability ---
$HasWinget = Test-Command "winget"

# --- Install via winget ---
function Install-WithWinget {
    param([string]$PackageId, [string]$Name)

    Write-Info "Installing $Name via winget..."
    winget install --id $PackageId --exact --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) {
        Write-Err "winget install failed for $Name."
        return $false
    }
    # Refresh PATH so the new binary is visible in this session
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")
    return $true
}

# --- Direct download fallback ---
function Install-YtDlpDirect {
    $url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
    $dest = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
    if (-not (Test-Path $dest)) { $dest = $env:LOCALAPPDATA }
    $destFile = Join-Path $dest "yt-dlp.exe"

    Write-Info "Downloading yt-dlp from GitHub releases..."
    Invoke-WebRequest -Uri $url -OutFile $destFile -UseBasicParsing
    if (-not (Test-Path $destFile)) {
        Write-Err "Failed to download yt-dlp."
        return $false
    }

    # Add to user PATH if not already present
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath -notlike "*$dest*") {
        [System.Environment]::SetEnvironmentVariable("Path", "$userPath;$dest", "User")
        $env:Path = "$env:Path;$dest"
        Write-Info "Added $dest to user PATH."
    }
    return $true
}

function Install-FfmpegDirect {
    $url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    $tempZip = Join-Path $env:TEMP "ffmpeg.zip"
    $extractDir = Join-Path $env:LOCALAPPDATA "ffmpeg"

    Write-Info "Downloading ffmpeg from gyan.dev..."
    Invoke-WebRequest -Uri $url -OutFile $tempZip -UseBasicParsing

    Write-Info "Extracting ffmpeg..."
    if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
    Expand-Archive -Path $tempZip -DestinationPath $extractDir -Force
    Remove-Item $tempZip -Force

    # Find the bin directory inside the extracted folder
    $binDir = Get-ChildItem -Path $extractDir -Recurse -Directory -Filter "bin" | Select-Object -First 1
    if (-not $binDir) {
        Write-Err "Could not find ffmpeg bin directory after extraction."
        return $false
    }

    # Add to user PATH if not already present
    $binPath = $binDir.FullName
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath -notlike "*$binPath*") {
        [System.Environment]::SetEnvironmentVariable("Path", "$userPath;$binPath", "User")
        $env:Path = "$env:Path;$binPath"
        Write-Info "Added $binPath to user PATH."
    }
    return $true
}

# --- Install a tool if missing ---
function Install-IfMissing {
    param(
        [string]$Command,
        [string]$WingetId,
        [scriptblock]$DirectInstall
    )

    if (Test-Command $Command) {
        Write-Ok "$Command is already installed."
        return $true
    }

    if ($HasWinget) {
        $result = Install-WithWinget -PackageId $WingetId -Name $Command
        if ($result) { return $true }
        Write-Warn "winget failed; trying direct download..."
    } else {
        Write-Warn "winget not available; using direct download..."
    }

    return (& $DirectInstall)
}

# --- Verify installation ---
function Confirm-Install {
    param([string]$Command, [string]$VersionFlag)

    if (-not (Test-Command $Command)) {
        Write-Err "$Command not found after installation. You may need to restart your terminal."
        return $false
    }

    $version = & $Command $VersionFlag 2>&1 | Select-Object -First 1
    Write-Ok "$Command`: $version"
    return $true
}

# --- Main ---
Write-Host ""
Write-Host "VibeCast Dependency Installer" -ForegroundColor Cyan
Write-Host ([char]0x2500 * 30)
Write-Host ""

if (-not $HasWinget) {
    Write-Warn "winget not found. Will fall back to direct downloads."
}

Write-Info "Checking dependencies..."
Write-Host ""

$ok = $true

$result = Install-IfMissing -Command "yt-dlp" -WingetId "yt-dlp.yt-dlp" -DirectInstall { Install-YtDlpDirect }
if (-not $result) { $ok = $false }

$result = Install-IfMissing -Command "ffmpeg" -WingetId "Gyan.FFmpeg" -DirectInstall { Install-FfmpegDirect }
if (-not $result) { $ok = $false }

Write-Host ""
Write-Info "Verifying installations..."
Write-Host ""

if (-not (Confirm-Install "yt-dlp" "--version")) { $ok = $false }
if (-not (Confirm-Install "ffmpeg" "-version"))   { $ok = $false }

Write-Host ""
if ($ok) {
    Write-Ok "All dependencies installed. You're ready to run VibeCast!"
} else {
    Write-Err "Some dependencies failed to install. See errors above."
    exit 1
}
