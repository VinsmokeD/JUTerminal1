# Parallax Kali student shell configuration

# Colored prompt showing scenario context
SCENARIO=${SCENARIO_ID:-"??"}
export PS1="\[\033[01;32m\]student@kali\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\] [\[\033[01;35m\]${SCENARIO}\[\033[00m\]] \$ "

# Useful aliases
alias ll='ls -la --color=auto'
alias grep='grep --color=auto'
function nmap() {
  local has_port_scope=0
  local has_version_scan=0
  for arg in "$@"; do
    case "$arg" in
      -p|--top-ports|-F|--exclude-ports|-p*) has_port_scope=1 ;;
      -sV|-A) has_version_scan=1 ;;
    esac
  done

  local defaults=(-sT -Pn --reason --max-retries 1 --host-timeout 25s --stats-every 5s)
  if [ "$has_version_scan" -eq 1 ]; then
    defaults+=(--version-intensity 0)
  fi

  if [ "$has_port_scope" -eq 1 ]; then
    /usr/local/bin/nmap "${defaults[@]}" "$@"
  else
    /usr/local/bin/nmap "${defaults[@]}" --top-ports 10 "$@"
  fi
}
alias cls='clear'

# Pre-configured paths
export PATH="$PATH:/home/student/tools:/home/student/.local/bin"

# Quick targets reminder
alias scope='echo "Scope: Check /home/student/scope.txt for in-scope targets"'

# Network helpers
alias myip='ip addr show | grep "inet " | grep -v 127.0.0.1'
alias ports='ss -tlnp'

echo ""
echo "  Parallax â€” Kali Terminal"
echo "  Scenario: ${SCENARIO_ID:-'Not set'}"
echo "  Session:  ${SESSION_ID:-'Not set'}"
echo "  Type 'scope' to see your authorized targets."
echo ""
