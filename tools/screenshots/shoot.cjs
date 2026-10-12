// 使い方ガイドのスクショを撮る（Linux・Playwright 版）。
// 偽の保管庫（server.py）に見本データを置き、テスト版（site/shot.html）を開いて操作する。
//   ./make-site.sh && python3 server.py 8766 &
//   NODE_PATH=$(npm root -g) node shoot.cjs [撮る名前…]
// できた画像は shots/ に出る。確かめてから マニュアル/images/ にコピーする。
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");

const SP = __dirname;
const BASE = "http://localhost:8766/shot.html";
const FIXTURE = fs.readFileSync(path.join(SP, "vault", "kinyou.json"));
const W = 350, H = 700;                       // iPhone の見た目（2倍で 700px 幅の画像になる）
const NOW = "2026-09-25T19:00:00+09:00";      // 9/24 の翌日（「今日の卓」が無い状態）

const wait = ms => new Promise(r => setTimeout(r, ms));

// 各ショット：開くリンク、操作、囲む所、切り取り方
//   clip: [上, 高さ]（CSS px）／ "sheet"＝下から出るシートの部分／ {around:セレクタ, h:高さ}
const SHOTS = {
  home:        {link:"e", act: async p => { await p.click("[data-go-home]"); await wait(400); },
                clip:[0, 210]},
  stats:       {link:"s", hl:["[data-choose-self]"], clip:[0, 392]},
  viewer:      {link:"s", hl:["[data-refresh-share]"], clip:[0, 448]},
  records:     {link:"e", act: tab("記録"), hl:["[data-new-session]"]},
  records_top: {link:"e", act: tab("記録"), clip:[0, 182]},
  session:     {link:"e", act: day(/9月24日/), hl:["[data-add-game]"]},
  session_open:{link:"e", act: day(/9月24日/), hl:[".tabs"], clip:[0, 392]},
  game_open:   {link:"e", act: async p => { await day(/9月24日/)(p);
                  await p.click('button[data-toggle-game="0"]'); await wait(300);
                  await p.locator("[data-edit-game]").first().scrollIntoViewIfNeeded(); },
                hl:["[data-edit-game]"], clip:{around:"[data-edit-game]", h:392}},
  parts:       {link:"e", act: async p => { await tab("記録")(p);
                  await p.click("[data-new-session]"); await wait(800); },
                hl:[".sheet .chiprow"], clip:"sheet"},
  sheet_rest:  {link:"e", act: sheet(["384","251","172"]), hl:["[data-fill-rest]"], clip:"sheet"},
  sheet_done:  {link:"e", act: sheet(["384","251","172","193"]), hl:["button.wide[data-save-game]"], clip:"sheet"},
  sheet_tobi:  {link:"e", act: sheet(["521","302","190","-13"]), hl:["#tobi select"], clip:"sheet"},
  setup:       {link:"e", act: async p => { await day(/9月18日/)(p);
                  await p.click('[data-stab="setup"]'); await wait(300); },
                hl:['[data-stab="setup"]', "[data-chip]"], clip:[0, 616]},
  setup_members:{link:"e", act: async p => { await day(/9月24日/)(p);
                  await p.click('[data-stab="setup"]'); await wait(300);
                  await p.locator("[data-add-guest]").scrollIntoViewIfNeeded(); },
                hl:[".card:has(> h2.sec) .chiprow", "[data-add-guest]"],
                clip:{around:"[data-add-guest]", h:336}},
  dayrules:    {link:"e", act: async p => { await day(/9月24日/)(p);
                  await p.click('[data-stab="data"]'); await wait(300);
                  await p.click("[data-open-day-rules]"); await wait(800); },
                hl:['.sheet [data-rule="rate"]'], clip:"sheet"},
};

function tab(label){
  return async p => { await p.locator(".tabs button", {hasText: label}).first().click(); await wait(300); };
}
function day(re){
  return async p => { await tab("記録")(p);
    await p.locator("[data-go-session]").filter({hasText: re}).first().click(); await wait(400); };
}
function sheet(vals){
  return async p => { await day(/9月24日/)(p);
    await p.click("[data-add-game]"); await wait(600);
    await p.evaluate(vals => {
      document.querySelectorAll("input[data-pt]").forEach((e, i) => {
        if (vals[i] != null){ e.value = vals[i]; e.dispatchEvent(new Event("input", {bubbles:true})); }
      });
      document.activeElement && document.activeElement.blur();
    }, vals);
    await wait(800);
  };
}

// 赤い枠で囲む（画面の上に重ねるだけ。アプリには触らない）
async function highlight(p, sels){
  await p.evaluate(sels => {
    sels.forEach(sel => document.querySelectorAll(sel).forEach(el => {
      const r = el.getBoundingClientRect(); if (!r.width) return;
      const d = document.createElement("div");
      // 画面の端からはみ出さないように内側に収める
      const L = Math.max(2, r.left-4), R = Math.min(innerWidth-2, r.right+4);
      Object.assign(d.style, {position:"fixed", left:L+"px", top:(r.top-4)+"px",
        width:(R-L)+"px", height:(r.height+8)+"px", border:"2.5px solid #D93025",
        borderRadius:"8px", boxSizing:"border-box", zIndex:9999, pointerEvents:"none"});
      document.body.appendChild(d);
    }));
  }, sels);
}

async function clipOf(p, clip){
  if (!clip) return {x:0, y:0, width:W, height:H};
  if (Array.isArray(clip)) return {x:0, y:clip[0], width:W, height:clip[1]};
  if (clip === "sheet"){
    const r = await p.locator(".sheet").first().boundingBox();
    const top = Math.max(0, Math.floor(r.y));
    return {x:0, y:top, width:W, height:Math.min(H, Math.ceil(r.y + r.height)) - top};
  }
  const r = await p.locator(clip.around).first().boundingBox();
  const top = Math.max(0, Math.min(H - clip.h, Math.round(r.y + r.height/2 - clip.h/2)));
  return {x:0, y:top, width:W, height:clip.h};
}

(async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SHOTS);
  const browser = await chromium.launch();
  for (const name of names){
    const s = SHOTS[name]; if (!s){ console.error("不明:", name); continue; }
    // 撮るたびに見本データを置き直す（前の撮影で書き換わらないように）
    fs.writeFileSync(path.join(SP, "vault", "kinyou.json"), FIXTURE);
    const ctx = await browser.newContext({viewport:{width:W, height:H}, deviceScaleFactor:2,
      locale:"ja-JP", timezoneId:"Asia/Tokyo", isMobile:true, hasTouch:true,
      userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"});
    const p = await ctx.newPage();
    // 本物の保管庫へは絶対に出さない
    await p.route(/script\.google\.com|googleusercontent\.com/, r => r.abort());
    await p.clock.setFixedTime(new Date(NOW));
    await p.goto(`${BASE}?${s.link}=kinyou`);
    await p.waitForSelector(".tabs", {timeout:10000});
    await wait(800);
    if (s.act) await s.act(p);
    await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
    await wait(300);
    if (s.hl) await highlight(p, s.hl);
    const clip = await clipOf(p, s.clip);
    await p.screenshot({path: path.join(SP, "shots", name + ".jpg"), type:"jpeg", quality:88, clip});
    console.log("撮影:", name, `${clip.width*2}x${clip.height*2}`);
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
