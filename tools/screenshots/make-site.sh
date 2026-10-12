#!/bin/sh
# 撮影用のテスト版を site/ に作る。保管庫の宛先を偽の保管庫（server.py）に差し替える。
# 本物の保管庫（Google Apps Script）には一切つながない。
set -e
SP=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$SP/../.." && pwd)
"$ROOT/build.sh" >/dev/null
rm -rf "$SP/site" "$SP/vault"; mkdir -p "$SP/site" "$SP/vault" "$SP/shots"
sed 's#https://script.google.com/macros/s/${id}/exec#http://localhost:8766/vault/${id}/exec#' \
  "$ROOT/index.html" > "$SP/site/shot.html"
# 差し替えに失敗したまま撮らない（本物に送らないための確認）
if grep -q 'script.google.com/macros/s/${id}' "$SP/site/shot.html"; then
  echo "保管庫の宛先を差し替えられませんでした" >&2; exit 1; fi
cp "$ROOT/apple-touch-icon.png" "$ROOT/favicon.png" "$SP/site/"
node "$SP/fixture.cjs" > "$SP/vault/kinyou.json"
echo "site/shot.html を作りました"
