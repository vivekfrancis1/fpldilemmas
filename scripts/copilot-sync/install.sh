#!/bin/bash
# Installs a macOS launchd agent that runs the Copilot sync whenever
# "Manual Uploads/xMins/Copilot projections/copilot_xmins_xpts_next6.json" changes.
# Remove it again with scripts/copilot-sync/uninstall.sh. Logs: ~/Library/Logs/fpldilemmas-copilot-sync.log
set -e
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LABEL="com.fpldilemmas.copilot-xmins-sync"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
WATCH_FILE="$PROJECT_DIR/Manual Uploads/xMins/Copilot projections/copilot_xmins_xpts_next6.json"
NODE_BIN_DIR="$(dirname "$(command -v npx)")"
LOG="$HOME/Library/Logs/fpldilemmas-copilot-sync.log"

chmod +x "$PROJECT_DIR/scripts/copilot-sync/run-sync.sh"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$PROJECT_DIR/scripts/copilot-sync/run-sync.sh</string></array>
  <key>WatchPaths</key>
  <array><string>$WATCH_FILE</string></array>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>$NODE_BIN_DIR:/usr/local/bin:/usr/bin:/bin</string></dict>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed $LABEL — watching: $WATCH_FILE"
echo "Log: $LOG"
