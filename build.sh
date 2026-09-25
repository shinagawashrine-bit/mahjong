#!/bin/sh
# app.html（Artifact用・head や body タグを持たない断片）から、
# 自分のサーバーにそのまま置ける index.html を作る。
# app.html を直したら、このスクリプトを実行して index.html を作り直すこと。
set -e
cd "$(dirname "$0")"

{
  cat <<'HEAD'
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>麻雀成績</title>
<meta name="theme-color" content="#E4E4DA">
<meta name="color-scheme" content="light">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="麻雀成績">
<link rel="apple-touch-icon" href="apple-touch-icon.png?v=2">
<link rel="icon" href="favicon.png?v=2">
</head>
<body>
HEAD
  # app.html 側の <title> は head に移してあるので取り除く
  grep -v '^<title>麻雀成績</title>$' app.html
  cat <<'TAIL'
</body>
</html>
TAIL
} > index.html

# 使い方ガイド（マニュアル/）を、アプリと同じ場所の guide/ に置く
rm -rf guide
mkdir -p guide/images
cp "マニュアル/20260925_mahjong-guide-web.html" guide/index.html
cp マニュアル/images/*.jpg guide/images/

echo "index.html を作りました（$(wc -c < index.html | tr -d ' ') バイト）"
