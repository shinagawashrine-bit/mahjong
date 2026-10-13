// 使い方ガイド（マニュアル/20260925_mahjong-guide-web.html）から印刷用 PDF を作る（Linux・Playwright）。
//   FONTCONFIG_FILE=$PWD/tools/screenshots/fonts.conf NODE_PATH=$(npm root -g) node tools/make-guide-pdf.cjs
const path = require("path");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "マニュアル", "20260925_mahjong-guide-web.html");
const OUT = path.join(ROOT, "マニュアル", "麻雀成績_使い方ガイド.pdf");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("file://" + SRC, {waitUntil: "networkidle"});
  await page.pdf({path: OUT, format: "A4", printBackground: true, preferCSSPageSize: true, scale: 0.65});
  await browser.close();
  console.log("作りました:", path.relative(ROOT, OUT));
})().catch(e => { console.error(e); process.exit(1); });
