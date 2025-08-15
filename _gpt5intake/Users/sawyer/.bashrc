# Bash configuration file
# This file is sourced by bash_profile

# Environment variables
export PATH="/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
export SHELL="/bin/bash"
export TERM="xterm-256color"

# Interactive shell settings
if [[ $- != *i* ]]; then
    return
fi

# History settings
HISTSIZE=1000
HISTFILESIZE=2000
HISTCONTROL=ignoreboth
HISTIGNORE="ls:ll:la:l:cd:pwd:clear:history"

# Shell options
shopt -s histappend
shopt -s checkwinsize
shopt -s globstar

# Completion
if [[ -f /etc/bash_completion ]]; then
    source /etc/bash_completion
fi

# Prompt
PS1='\u@\h:\w\$ '

# Aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias grep='grep --color=auto'
alias fgrep='fgrep --color=auto'
alias egrep='egrep --color=auto'

# Functions
function mkcd() {
    mkdir -p "$1" && cd "$1"
}

function extract() {
    if [[ -f $1 ]]; then
        case $1 in
            *.tar.bz2)   tar xjf $1     ;;
            *.tar.gz)    tar xzf $1     ;;
            *.bz2)       bunzip2 $1     ;;
            *.rar)       unrar e $1     ;;
            *.gz)        gunzip $1      ;;
            *.tar)       tar xf $1      ;;
            *.tbz2)      tar xjf $1     ;;
            *.tgz)       tar xzf $1     ;;
            *.zip)       unzip $1       ;;
            *.Z)         uncompress $1  ;;
            *.7z)        7z x $1        ;;
            *)           echo "'$1' cannot be extracted via extract()" ;;
        esac
    else
        echo "'$1' is not a valid file"
    fi
}
