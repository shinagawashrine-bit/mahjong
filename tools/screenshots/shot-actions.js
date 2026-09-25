<script>
(function(){
const q=s=>document.querySelector(s); const w=ms=>new Promise(r=>setTimeout(r,ms));
const btn=t=>[...document.querySelectorAll("button")].find(b=>b.textContent.trim()===t);
const sess=re=>[...document.querySelectorAll("button,[data-go-session]")].filter(b=>re.test(b.textContent))[0];
const fill=async vals=>{document.querySelectorAll("input[data-pt]").forEach((e,i)=>{ if(vals[i]!=null){e.value=vals[i]; e.dispatchEvent(new Event("input",{bubbles:true}));}}); await w(200);};
const MARK=[]; const hl=el=>{ if(el) MARK.push(el); };
const hs=sel=>{ MARK.push(sel); };
const shot=(location.hash.match(/shot=([\w-]+)/)||[])[1];
const A={
  stats: async()=>{},
  viewer: async()=>{ hl(q("[data-refresh-share]")); },
  records: async()=>{ btn("記録").click(); await w(200); hl(q("[data-new-session]")); },
  home: async()=>{ q(".back").click(); await w(300); hl(q("[data-go-community]")); },
  session: async()=>{ btn("記録").click(); await w(300); sess(/9月24日/).click(); await w(200); hl(q("[data-add-game]")); },
  sheet_empty: async()=>{ btn("記録").click(); await w(300); sess(/9月24日/).click(); await w(300); q("[data-add-game]").click(); await w(400); document.activeElement.blur(); },
  sheet_rest: async()=>{ btn("記録").click(); await w(300); sess(/9月24日/).click(); await w(300); q("[data-add-game]").click(); await w(400); await fill(["384","251","172"]); document.activeElement.blur(); await w(800); hs("[data-fill-rest]"); },
  sheet_done: async()=>{ btn("記録").click(); await w(300); sess(/9月24日/).click(); await w(300); q("[data-add-game]").click(); await w(400); await fill(["384","251","172","193"]); document.activeElement.blur(); await w(800); hs("button.wide[data-save-game]"); },
  sheet_tobi: async()=>{ btn("記録").click(); await w(300); sess(/9月24日/).click(); await w(300); q("[data-add-game]").click(); await w(400); await fill(["521","302","190","-13"]); document.activeElement.blur(); await w(800); hs("#tobi select"); },
  session_open: async()=>{ btn("記録").click(); await w(300); sess(/9月24日/).click(); await w(300); q('button[data-toggle-game="0"]').click(); await w(200); q(".gtbl.games").scrollIntoView({block:"center"}); hl(q("[data-edit-game]")); },
  setup: async()=>{ btn("記録").click(); await w(300); sess(/9月18日/).click(); await w(300); q('[data-stab="setup"]').click(); await w(200); hl(q('[data-stab="setup"]')); document.querySelectorAll("[data-chip]").forEach(hl); },
  setup_members: async()=>{ btn("記録").click(); await w(300); sess(/9月24日/).click(); await w(300); q('[data-stab="setup"]').click(); await w(200); [...document.querySelectorAll("h2.sec")].find(h=>h.textContent.includes("参加メンバー")).scrollIntoView({block:"center"}); hl(q("[data-add-guest]")); hl(document.querySelectorAll(".chiprow")[0]); },
  member: async()=>{ q("[data-go-member]").click(); },
  parts: async()=>{ btn("記録").click(); await w(300); sess(/9月24日/).click(); await w(300); q("[data-open-parts]").click(); await w(300); hs(".sheet .chiprow"); },
  session_top: async()=>{ btn("記録").click(); await w(300); sess(/9月24日/).click(); await w(300); hs("[data-send-status]"); document.querySelectorAll(".partline").forEach(hl); },
  dayrules: async()=>{ btn("記録").click(); await w(300); sess(/9月24日/).click(); await w(300); q("[data-open-day-rules]").click(); await w(300); hs('.sheet [data-rule="rate"]'); },
  home: async()=>{ q(".back").click(); },
};
window.addEventListener("load", async()=>{ await w(1500); if (A[shot]) await A[shot](); await w(600);
  document.activeElement && document.activeElement.blur && document.activeElement.blur();
  const rects=MARK.map(m=>typeof m==="string"?q(m):m).filter(Boolean).map(e=>{const r=e.getBoundingClientRect(); return [r.left,r.top,r.width,r.height, e.closest(".sheet,.fab")?1:0, innerHeight];});
  const measure=()=>MARK.map(m=>typeof m==="string"?q(m):m).filter(Boolean).map(e=>{const r=e.getBoundingClientRect(); return [r.left,r.top,r.width,r.height,0,innerHeight];});
  const post=(k,d)=>fetch("http://localhost:8766/vault/x/exec",{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({k,data:d})});
  post("rect_"+shot, measure());
  window.addEventListener("resize", ()=>{ post("rect2_"+shot, measure()); });
  await w(300); });
})();
</script>
