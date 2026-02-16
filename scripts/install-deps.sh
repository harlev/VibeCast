#!/usr/bin/env bash
#
# Install VibeCast external dependencies (yt-dlp, ffmpeg)
# Works on macOS and Linux via Homebrew.
#
set -euo pipefail

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { printf "${BLUE}[info]${NC}  %s\n" "$*"; }
success() { printf "${GREEN}[ok]${NC}    %s\n" "$*"; }
warn()    { printf "${YELLOW}[warn]${NC}  %s\n" "$*"; }
error()   { printf "${RED}[error]${NC} %s\n" "$*"; }

# --- Homebrew ---
ensure_homebrew() {
  if command -v brew &>/dev/null; then
    info "Homebrew found at $(command -v brew)"
    return
  fi

  warn "Homebrew is not installed."
  read -rp "Install Homebrew now? [Y/n] " answer
  answer="${answer:-Y}"
  if [[ "$answer" =~ ^[Yy] ]]; then
    info "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Ensure brew is on PATH for the rest of this script
    if [[ -x /opt/homebrew/bin/brew ]]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [[ -x /usr/local/bin/brew ]]; then
      eval "$(/usr/local/bin/brew shellenv)"
    elif [[ -x /home/linuxbrew/.linuxbrew/bin/brew ]]; then
      eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    fi
  else
    error "Homebrew is required. Install it from https://brew.sh and re-run this script."
    exit 1
  fi
}

# --- Install a formula if missing ---
install_if_missing() {
  local cmd="$1"
  local formula="$2"

  if command -v "$cmd" &>/dev/null; then
    success "$cmd is already installed ($(command -v "$cmd"))"
    return
  fi

  info "Installing $formula..."
  brew install "$formula"
}

# --- Verify installation ---
verify() {
  local cmd="$1"
  local version_flag="$2"

  if ! command -v "$cmd" &>/dev/null; then
    error "$cmd not found after installation. Check your PATH."
    return 1
  fi

  local version
  version=$("$cmd" $version_flag 2>&1 | head -n1)
  success "$cmd: $version"
}

# --- Main ---
main() {
  printf "\n${BLUE}VibeCast Dependency Installer${NC}\n"
  printf "%s\n\n" "──────────────────────────────"

  ensure_homebrew

  echo ""
  info "Checking dependencies..."
  echo ""

  install_if_missing yt-dlp yt-dlp
  install_if_missing ffmpeg ffmpeg

  echo ""
  info "Verifying installations..."
  echo ""

  local failed=0
  verify yt-dlp "--version"  || failed=1
  verify ffmpeg "-version"   || failed=1

  echo ""
  if [[ "$failed" -eq 0 ]]; then
    success "All dependencies installed. You're ready to run VibeCast!"
  else
    error "Some dependencies failed to install. See errors above."
    exit 1
  fi
}

main
