#!/bin/sh
# app.html を直したあと、これを実行すると公開ページに反映される。
#   https://shinagawashrine-bit.github.io/mahjong/
# 認証はこのフォルダ専用のデプロイキー（~/.ssh/id_ed25519_mahjong）。
# 会社アカウントの設定には触れない。
set -e
cd "$(dirname "$0")"

./build.sh
git add -A guide
git add index.html apple-touch-icon.png favicon.png
if git diff --cached --quiet; then
  echo "変更なし。反映するものがありません"
  exit 0
fi
git -c user.name="mahjong-app" -c user.email="noreply@example.com" \
    commit -q -m "${1:-アプリを更新}"
git push -q origin main
echo "送信しました。1分ほどで公開ページに反映されます"
