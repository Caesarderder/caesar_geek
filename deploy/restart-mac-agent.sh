#!/usr/bin/env bash
set -euo pipefail

CAESAR_GATEWAY_URL="${CAESAR_GATEWAY_URL:-http://47.93.141.241}"
CAESAR_WORLD_ID="${CAESAR_WORLD_ID:-mac-mini}"
CAESAR_GATEWAY_TOKEN="${CAESAR_GATEWAY_TOKEN:?CAESAR_GATEWAY_TOKEN is required}"
REPO_ROOT="${REPO_ROOT:-/Users/mac/workspace/caesar/caesar_geek}"
AGENT_HOME="${AGENT_HOME:-${HOME}/.caesar-geek/cloud-agent}"
PLIST="${PLIST:-${HOME}/Library/LaunchAgents/com.caesar.cloud-agent.plist}"
LABEL="com.caesar.cloud-agent"

mkdir -p "${AGENT_HOME}" "${HOME}/Library/LaunchAgents"

cat > "${AGENT_HOME}/run.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export CAESAR_GATEWAY_URL="${CAESAR_GATEWAY_URL}"
export CAESAR_GATEWAY_TOKEN="${CAESAR_GATEWAY_TOKEN}"
export CAESAR_WORLD_ID="${CAESAR_WORLD_ID}"
cd "${REPO_ROOT}"
exec pnpm --filter @caesar-geek/cloud-agent dev
EOF
chmod 700 "${AGENT_HOME}/run.sh"

cat > "${PLIST}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${AGENT_HOME}/run.sh</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>${REPO_ROOT}</string>
  <key>StandardOutPath</key>
  <string>${AGENT_HOME}/stdout.log</string>
  <key>StandardErrorPath</key>
  <string>${AGENT_HOME}/stderr.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)" "${PLIST}" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "${PLIST}"
launchctl kickstart -k "gui/$(id -u)/${LABEL}"

sleep 2
launchctl print "gui/$(id -u)/${LABEL}" | sed -n "1,60p"
echo "--- stdout ---"
tail -n 30 "${AGENT_HOME}/stdout.log" 2>/dev/null || true
echo "--- stderr ---"
tail -n 30 "${AGENT_HOME}/stderr.log" 2>/dev/null || true
