# CyberSim Kali student shell configuration

# Colored prompt showing scenario context
SCENARIO=${SCENARIO_ID:-"??"}
export PS1="\[\033[01;32m\]student@kali\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\] [\[\033[01;35m\]${SCENARIO}\[\033[00m\]] \$ "

# Useful aliases
alias ll='ls -la --color=auto'
alias grep='grep --color=auto'
alias nmap='nmap --reason'
alias cls='clear'

# Pre-configured paths
export PATH="$PATH:/home/student/tools"

# Quick targets reminder
alias scope='echo "Scope: Check /home/student/scope.txt for in-scope targets"'

# Network helpers
alias myip='ip addr show | grep "inet " | grep -v 127.0.0.1'
alias ports='ss -tlnp'

echo ""
echo "  CyberSim — Kali Terminal"
echo "  Scenario: ${SCENARIO_ID:-'Not set'}"
echo "  Session:  ${SESSION_ID:-'Not set'}"
echo "  Type 'scope' to see your authorized targets."
echo ""
