#!/bin/sh
# usage: shot.sh name query width height
SP=$(dirname "$0"); CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
rm -rf "$SP/chrome-prof-$1"
"$CH" --headless=new --disable-gpu --hide-scrollbars --window-size=${3:-430},${4:-900} --force-device-scale-factor=2 --virtual-time-budget=6000 --timeout=12000 --user-data-dir="$SP/chrome-prof-$1" --screenshot="$SP/shots/$1.png" "http://localhost:8767/shot.html?$2#shot=$1" > "$SP/chrome-$1.log" 2>&1 &
PID=$!; sleep 14; kill $PID 2>/dev/null; pkill -f "chrome-prof-$1" 2>/dev/null; rm -rf "$SP/chrome-prof-$1"
