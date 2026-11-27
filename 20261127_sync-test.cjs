// 端末どうしの同期を試す（2026/11/27）。node 20261127_sync-test.cjs
// 1つの app.html を端末ごとに別の vm で動かし、偽の保管庫（メモリ上）を共有させる。本物の保管庫には一切つながない。
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync(__dirname + '/app.html', 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];

const VAULT = {};                        // 偽の保管庫：合言葉 → 中身
const fakeFetch = async (url, opt) => {
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec/.test(url)) throw Error('unexpected url ' + url);
  if (opt && opt.method === 'POST'){
    const b = JSON.parse(opt.body); VAULT[b.k] = JSON.parse(JSON.stringify(b.data));
    return {ok: true, json: async () => ({ok: true})};
  }
  const k = decodeURIComponent(url.split('?k=')[1] || '');
  const d = VAULT[k];
  return {ok: true, json: async () => d ? JSON.parse(JSON.stringify(d)) : {error: 'notfound'}};
};
let offline = false;

function device(name){
  const store = () => ({data: {}, getItem(k){ return this.data[k] ?? null }, setItem(k, v){ this.data[k] = String(v) }, removeItem(k){ delete this.data[k] }});
  const el = () => ({remove(){}, appendChild(){}, set innerHTML(v){}, style: {}, classList: {add(){}, remove(){}}, querySelector(){ return null }, querySelectorAll(){ return [] }});
  const doc = {addEventListener(){}, querySelectorAll(){ return [] }, querySelector(){ return null },
    getElementById(){ return el() }, createElement: el, body: el(), activeElement: null, hidden: false};
  const ctx = vm.createContext({console, URLSearchParams, Date, JSON, Math, Promise,
    localStorage: store(), sessionStorage: store(), navigator: {userAgent: 'test'},
    location: {search: '', href: 'https://example.invalid/', origin: 'https://example.invalid', pathname: '/'},
    history: {replaceState(){}}, document: doc, setTimeout: () => 1, clearTimeout(){}, setInterval(){},
    window: {navigator: {}, matchMedia: () => ({matches: false, addEventListener(){}}), addEventListener(){}},
    fetch: (u, o) => offline ? Promise.reject(Error('offline')) : fakeFetch(u, o)});
  vm.runInContext(src, ctx);
  ctx.run = code => vm.runInContext(code, ctx);
  ctx.name = name;
  return ctx;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const check = (v, m) => { if (!v) throw Error('NG: ' + m); console.log('  ok  ' + m); };
const KEYID = 'AKfycbyx4wvBOwWha7YM2xLRwyCEILSU1Ktx9iGJH0OfEaD7oCFNClRh_9JPgWGL6AFJcnAp';

(async () => {
  const A = device('iPhone'), B = device('iPad mini'), C = device('iPad air');
  // --- 幹事の iPhone：コミュニティを作って共有・バックアップを始める
  A.run(`DB.syncId = "${KEYID}"; DB.backupKey = "bk1";
    const c = {id:"jyu", name:"JYU-KEN", rules:defaultRules(4), members:["a","b","c","d"].map(id=>({id, name:id}))};
    DB.communities.push(c);
    DB.sessions.push({id:"s1", communityId:"jyu", date:"2026-11-19", rules:c.rules, participantIds:["a","b","c","d"],
      games:[{id:"g1", seats:["a","b","c","d"], points:[40000,30000,20000,10000]}], chips:{}, penalties:{}});
    c.share = {key:"jyukey", id:DB.syncId}; c.shareAt = new Date().toISOString(); save();`);
  await A.run('pushShare(community("jyu"), true)');
  await A.run('syncGroup()');
  check(VAULT.jyukey && VAULT.bk_bk1, '幹事の端末が共有とバックアップを預けた');

  // --- iPad mini：合言葉だけで中身がそろう
  B.run(`DB.syncId = "${KEYID}"; DB.backupKey = "bk1"; save();`);
  await B.run('syncGroup()');
  check(B.run('community("jyu") && community("jyu").share.key') === 'jyukey', '2台目にコミュニティと共有の合言葉が来る');
  check(B.run('DB.sessions.filter(s=>s.communityId==="jyu").length') === 1, '2台目に記録が来る');

  // --- iPhone で新しいコミュニティを作る → iPad に出る
  await wait(5);
  A.run(`DB.communities.push({id:"naka", name:"麻雀仲良し", rules:defaultRules(4), members:["p","q","r","s"].map(id=>({id, name:id}))}); save();`);
  await A.run('syncGroup()'); await B.run('syncGroup()');
  check(B.run('!!community("naka")'), '新しく作ったコミュニティが2台目に出る');

  // --- iPad で「自分」を選ぶ → iPhone にも
  await wait(5);
  B.run('setMyMember(community("naka"), "q")');
  await B.run('syncGroup()'); await A.run('syncGroup()');
  check(A.run('myMember(community("naka")) && myMember(community("naka")).id') === 'q', '「自分」が幹事の端末どうしでそろう');

  // --- iPad で半荘を足して送る → iPhone は1分おきの読み直しで受け取る
  await wait(5);
  B.run(`DB.sessions.find(s=>s.id==="s1").games.push({id:"g2", c:1, seats:["a","b","c","d"], points:[10000,20000,30000,40000]}); save();`);
  await B.run('pushShare(community("jyu"), true)');
  await A.run('pullShare(community("jyu"))');
  check(A.run('DB.sessions.find(s=>s.id==="s1").games.length') === 2, '2台目で入れた半荘が1台目に届く（共有）');

  // --- 引き継ぎ（お金）を iPhone で変える → iPad に届く（今回のずれの再現）
  await wait(5);
  A.run('community("jyu").carry = {a: 2000}; save();');
  await A.run('pushShare(community("jyu"), true)');
  await B.run('pullShare(community("jyu"))');
  check(B.run('community("jyu").carry.a') === 2000, '引き継ぎの変更が2台目に届く');

  // --- 時計が進んだ端末でも、新しい記録を読み飛ばさない
  B.run('community("jyu").syncAt = "2099-01-01T00:00:00.000Z"');
  await wait(5);
  A.run('community("jyu").rules.rate = 50; save();');
  await A.run('pushShare(community("jyu"), true)');
  const r = await B.run('pullShare(community("jyu"))');
  check(r === true && B.run('community("jyu").rules.rate') === 50, '時計が進んでいる端末でも新しい記録を取り込む');
  check(await B.run('pullShare(community("jyu"))') === false, '同じなら「変わりない」');

  // --- 保管庫に無い合言葉は「見つからない」と分かる
  B.run('DB.communities.push({id:"x", name:"x", rules:defaultRules(4), members:[], share:{key:"nokey", id:DB.syncId}})');
  check(await B.run('pullShare(community("x"))') === 'missing', '保管庫に無いときは missing（「変わりありません」にしない）');
  B.run('DB.communities = DB.communities.filter(c=>c.id!=="x"); save();');
  offline = true;
  check(await B.run('pullShare(community("jyu"))') === null, '通信できないときは null');
  offline = false;

  // --- 3台目（iPad air）は合言葉を入れるだけでそろう
  C.run(`DB.syncId = "${KEYID}"; DB.backupKey = "bk1"; save();`);
  await C.run('syncGroup()');
  check(C.run('DB.communities.map(c=>c.id).sort().join()') === 'jyu,naka', '3台目にも全部のコミュニティが来る');
  check(C.run('myMember(community("naka")).id') === 'q', '3台目にも「自分」が来る');

  // --- 2台が同時に別の日を入れても両方残る
  await wait(5);
  A.run(`DB.sessions.push({id:"sA", communityId:"naka", date:"2026-11-20", rules:defaultRules(4), participantIds:["p","q","r","s"], games:[], chips:{}, penalties:{}}); save();`);
  C.run(`DB.sessions.push({id:"sC", communityId:"naka", date:"2026-11-21", rules:defaultRules(4), participantIds:["p","q","r","s"], games:[], chips:{}, penalties:{}}); save();`);
  await A.run('syncGroup()'); await C.run('syncGroup()'); await A.run('syncGroup()'); await B.run('syncGroup()');
  for (const D of [A, B, C])
    check(D.run('["sA","sC"].every(id=>DB.sessions.some(s=>s.id===id))'), D.name + ' に両方の日が残る');

  // --- コミュニティを消すと、ほかの端末からも消える。取り消せば戻る
  await wait(5);
  A.run('DB.communities = DB.communities.filter(c=>c.id!=="naka"); DB.sessions = DB.sessions.filter(s=>s.communityId!=="naka"); DB.ctomb = {naka: new Date().toISOString()}; save();');
  await A.run('syncGroup()'); await B.run('syncGroup()');
  check(!B.run('community("naka")'), '消したコミュニティがほかの端末からも消える');
  check(B.run('DB.sessions.every(s=>s.communityId!=="naka")'), 'その記録も消える');
  await wait(5);
  A.run(`DB.communities.push({id:"naka", name:"麻雀仲良し", rules:defaultRules(4), members:[], reviveAt:new Date().toISOString()}); save();`);
  await A.run('syncGroup()'); await B.run('syncGroup()');
  check(B.run('!!community("naka")'), '取り消して戻したコミュニティは、ほかの端末にも戻る');

  // --- 古い形の記録（共有を始めた時刻なし）で合言葉が食い違っていたら、両方が同じ方にそろう
  B.run('community("jyu").share = {key:"zzz", id:DB.syncId}; delete community("jyu").shareAt;');
  A.run('delete community("jyu").shareAt;');
  await B.run('syncGroup()'); await A.run('syncGroup()'); await B.run('syncGroup()');
  check(A.run('community("jyu").share.key') === B.run('community("jyu").share.key'), '食い違った共有の合言葉が1つにそろう');

  // --- 仲間の端末（編集者）は幹事のグループには入らない：バックアップの合言葉を持たない
  const F = device('仲間');
  F.run(`DB.communities.push({id:"shared_jyukey", share:{key:"jyukey", id:"${KEYID}"}, sharedFrom:true, readOnly:false, members:[], rules:defaultRules(4)}); save();`);
  await F.run('pullShare(community("shared_jyukey"))');
  check(F.run('community("shared_jyukey").name') === 'JYU-KEN' && !F.run('DB.backupKey'), '仲間の端末は共有だけを読み、幹事のグループには入らない');
  check(!Object.keys(VAULT.jyukey).includes('prefs'), '「自分」は共有の中身に入らない');

  console.log('PASS: 端末どうしの同期');
})().catch(e => { console.error(e); process.exit(1); });
