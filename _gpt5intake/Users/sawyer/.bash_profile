# Bash profile for terminal compatibility
# Source bashrc if it exists
if [[ -f ~/.bashrc ]]; then
    source ~/.bashrc
fi

# Set environment variables
export PATH="/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
export SHELL="/bin/bash"
export TERM="xterm-256color"

# Basic prompt
PS1='\u@\h:\w\$ '

# History settings
HISTSIZE=1000
HISTFILESIZE=2000
HISTCONTROL=ignoreboth

# Aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'

# Functions
function mkcd() {
    mkdir -p "$1" && cd "$1"
}
