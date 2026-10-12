// 撮影用の見本データ（架空の「金曜麻雀会」）。保管庫に預ける形（shareBody）で書き出す。
// usage: node fixture.cjs > vault/kinyou.json
const rules = {playerCount:4, startPoints:25000, returnPoints:30000, uma:[20,10,-10,-20],
  rate:100, chipPoints:2, chipStart:20, tieBreak:"seat", tobi:true, tobiPoints:10};
const at = "2026-09-24T07:35:00.000Z";
const members = [["tanaka","田中"],["sato","佐藤"],["suzuki","鈴木"],["takahashi","高橋"]]
  .map(([id,name])=>({id, name, at}));
const seats = members.map(m=>m.id);
const game = (sid, i, pts, extra) => Object.assign(
  {id:`${sid}_L${i}`, c:i, at, seats:seats.slice(), points:pts.map(p=>p*100)}, extra || {});
const day = (id, date, games, chipCounts) => ({id, communityId:"kinyou", date, at,
  rules:JSON.parse(JSON.stringify(rules)), participantIds:seats.slice(),
  games, chips:{}, penalties:{}, chipCounts: chipCounts || {}});
const sessions = [
  day("d0918", "2026-09-18", [
    game("d0918", 1, [520, 300, 200, -20], {tobiBy:{takahashi:"tanaka"}}),
    game("d0918", 2, [410, 280, 180, 130]),
    game("d0918", 3, [400, 180, 300, 120]),
    game("d0918", 4, [330, 390, 160, 120]),
  ], {tanaka:26, sato:18, suzuki:21, takahashi:15}),
  day("d0924", "2026-09-24", [
    game("d0924", 1, [320, 350, 130, 200]),
    game("d0924", 2, [240, 190, 410, 160]),
  ]),
];
process.stdout.write(JSON.stringify({name:"金曜麻雀会", rules, carry:{}, members,
  metaAt:at, tomb:{}, sessions, at}));
