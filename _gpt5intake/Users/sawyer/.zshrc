# Minimal shell profile for terminal repair
export PATH="/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"


### ─── PATH SETUP ──────────────────────────────────────────────────────────────
# Prioritize Homebrew-installed binaries
export PATH="/opt/homebrew/opt/libpq/bin:/opt/homebrew/opt/openjdk/bin:$PATH"

# Local user scripts and binaries
export PATH="$HOME/.local/bin:$HOME/bin:$PATH"

# gitSync scripts and base dir (de-duplicated)
export PATH="$HOME/gitSync/scripts:$HOME/gitSync:$PATH"

# Legacy absolute path fallback
export PATH="/Users/sawyer/bin:$PATH"

export SHELL="/bin/zsh"
export TERM="xterm-256color"
PS1='%n@%m:%~$ '


### ─── ENVIRONMENT VARIABLES ───────────────────────────────────────────────────
export JAVA_HOME="/opt/homebrew/opt/openjdk"