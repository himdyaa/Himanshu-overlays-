/* StreamOverlays engine — renders overlay types from query params + localStorage,
   and provides a live control dock when ?control=1 (use OBS "Interact" to click it). */
(function(){
"use strict";

var qs = new URLSearchParams(location.search);
function q(name, def){ var v = qs.get(name); return (v===null||v==="") ? def : v; }
function qi(name, def){ var v = parseInt(q(name, def), 10); return isNaN(v) ? def : v; }

var TYPE = q("type", "cricket");
var PROFILE = q("profile", "default");
var CONTROL = q("control", "0") === "1";
var LSKEY = "so_" + TYPE + "_" + PROFILE;

var DEFAULTS = {
  cricket:   { home:"IND", away:"PAK", hc:"#1a73e8", ac:"#e8212d", hr:0, wr:0, hb:0, wb:0, ovr:0, balls:0, inn:1, title:"" },
  football:  { home:"IND", away:"PAK", hc:"#1a73e8", ac:"#e8212d", hg:0, ag:0, clock:0, running:0, title:"" },
  lowerthird:{ name:"Himanshu Maske", title:"Reporter, Bol Bindu News", accent:"#e8212d", show:1, theme:"dark" },
  ticker:    { label:"BREAKING", heads:"Welcome to StreamOverlays\nAdd your headlines in the control panel", speed:40, bg:"#b30000", fg:"#ffffff", labelbg:"#111111" },
  countdown: { title:"Stream starts in", mins:10, remain:600, running:0, accent:"#e8212d" },
  livebug:   { text:"LIVE", color:"#e8212d", size:34 }
};

function loadState(){
  var d = DEFAULTS[TYPE] || {};
  var s = {};
  for (var k in d) s[k] = d[k];
  if (q("fresh","0")!=="1"){
    try {
      var saved = JSON.parse(localStorage.getItem(LSKEY) || "{}");
      for (var k2 in saved) if (k2 in s) s[k2] = saved[k2];
    } catch(e){}
  }
  // query params override saved state
  for (var k3 in s){
    var v = qs.get(k3);
    if (v !== null && v !== ""){
      if (typeof s[k3] === "number"){ var n = parseFloat(v); s[k3] = isNaN(n) ? s[k3] : n; }
      else s[k3] = v;
    }
  }
  return s;
}
var S = loadState();
function save(){ try{ localStorage.setItem(LSKEY, JSON.stringify(S)); }catch(e){} }

function esc(t){ return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function hex(c){ return /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#e8212d"; }

function oversStr(){ return S.ovr + "." + S.balls; }
function crr(){
  var balls = S.ovr*6 + S.balls;
  if (!balls) return "0.00";
  var r = (S.inn===1 ? S.hr : S.wr) / (balls/6);
  return r.toFixed(2);
}
function curBat(){ return S.inn===1 ? {r:S.hr, w:S.hb, o:oversStr()} : {r:S.wr, w:S.wb, o:oversStr()}; }
function otherBat(){ return S.inn===1 ? {r:S.wr, w:S.wb, t:S.away} : {r:S.hr, w:S.hb, t:S.home}; }

/* ---------------- RENDERERS ---------------- */
var R = {};

R.cricket = function(){
  var b = curBat(), o = otherBat();
  var batName = S.inn===1 ? S.home : S.away;
  var batCol = S.inn===1 ? hex(S.hc) : hex(S.ac);
  return '' +
  '<div class="sb-wrap">' +
    '<div class="sb-main">' +
      '<div class="sb-team" style="background:'+batCol+'">'+esc(batName)+'</div>' +
      '<div class="sb-score">'+b.r+'/'+b.w+'</div>' +
      '<div class="sb-overs">('+b.o+')</div>' +
      '<div class="sb-crr">CRR '+crr()+'</div>' +
    '</div>' +
    '<div class="sb-other"><span style="color:'+(S.inn===1?hex(S.ac):hex(S.hc))+'">'+esc(o.t)+'</span> '+o.r+'/'+o.w+'</div>' +
    (S.title ? '<div class="sb-title">'+esc(S.title)+'</div>' : '') +
  '</div>';
};

R.football = function(){
  var mm = Math.floor(S.clock/60), ss = S.clock%60;
  var clk = (mm<10?"0"+mm:mm) + ":" + (ss<10?"0"+ss:ss);
  return '' +
  '<div class="fb-wrap">' +
    '<div class="fb-team" style="background:'+hex(S.hc)+'">'+esc(S.home)+'</div>' +
    '<div class="fb-score">'+S.hg+' - '+S.ag+'</div>' +
    '<div class="fb-team" style="background:'+hex(S.ac)+'">'+esc(S.away)+'</div>' +
    '<div class="fb-clock'+(S.running?' live':'')+'">'+clk+'</div>' +
    (S.title ? '<div class="sb-title">'+esc(S.title)+'</div>' : '') +
  '</div>';
};

R.lowerthird = function(){
  var cls = S.show ? "lt-show" : "lt-hide";
  var dark = S.theme !== "light";
  return '' +
  '<div class="lt-pos"><div class="lt-card '+cls+(dark?' lt-dark':' lt-light')+'">' +
    '<div class="lt-bar" style="background:'+hex(S.accent)+'"></div>' +
    '<div class="lt-text"><div class="lt-name">'+esc(S.name)+'</div>' +
    '<div class="lt-sub">'+esc(S.title)+'</div></div>' +
  '</div></div>';
};

R.ticker = function(){
  var heads = String(S.heads).split("\n").map(function(h){return h.trim();}).filter(Boolean);
  if (!heads.length) heads = ["Add headlines in the control panel"];
  var items = heads.map(function(h){return '<span class="tk-item">'+esc(h)+'</span><span class="tk-dot">///</span>';}).join("");
  var dur = Math.max(8, (140 - S.speed));
  return '' +
  '<div class="tk-wrap" style="background:'+hex(S.bg)+';color:'+esc(S.fg||"#ffffff")+'">' +
    '<div class="tk-label" style="background:'+hex(S.labelbg)+'">'+esc(S.label)+'</div>' +
    '<div class="tk-view"><div class="tk-track" style="animation-duration:'+dur+'s">'+items+items+'</div></div>' +
  '</div>';
};

R.countdown = function(){
  var r = Math.max(0, Math.floor(S.remain));
  var hh = Math.floor(r/3600), mm = Math.floor((r%3600)/60), ss = r%60;
  var t = (hh? (hh<10?"0"+hh:hh)+":" : "") + (mm<10?"0"+mm:mm) + ":" + (ss<10?"0"+ss:ss);
  return '' +
  '<div class="cd-wrap">' +
    '<div class="cd-title">'+esc(S.title)+'</div>' +
    '<div class="cd-time" style="border-color:'+hex(S.accent)+'">'+t+'</div>' +
  '</div>';
};

R.livebug = function(){
  var sz = Math.max(16, Math.min(120, +S.size || 34));
  return '<div class="lb-wrap"><span class="lb-dot" style="background:'+hex(S.color)+'"></span>' +
    '<span class="lb-text" style="font-size:'+sz+'px;color:'+hex(S.color)+'">'+esc(S.text)+'</span></div>';
};

/* ---------------- CONTROL DOCK ---------------- */
function btn(label, fn, cls){ return '<button class="ctl-btn '+(cls||"")+'" data-act="'+label+'">'+label+'</button>'; }

var C = {};
C.cricket = function(){
  return '<div class="ctl-row"><span class="ctl-cap">Batting: ' + esc(S.inn===1?S.home:S.away) + '</span></div>' +
  '<div class="ctl-row">' + btn("+1","r1")+btn("+2","r2")+btn("+3","r3")+btn("+4","r4")+btn("+6","r6")+btn("W","wk","danger")+'</div>' +
  '<div class="ctl-row">'+btn("Ball","ball")+btn("Wide","wide")+btn("No Ball","noball")+btn("Undo W","uw")+'</div>' +
  '<div class="ctl-row">'+btn("Innings 1","i1")+btn("Innings 2","i2")+btn("Reset","reset","danger")+'</div>' +
  '<div class="ctl-row"><input id="f-home" value="'+esc(S.home)+'" maxlength="6" placeholder="Home"><input id="f-away" value="'+esc(S.away)+'" maxlength="6" placeholder="Away"><input id="f-title" value="'+esc(S.title)+'" placeholder="Title (optional)"></div>' +
  '<div class="ctl-row"><input type="color" id="f-hc" value="'+hex(S.hc)+'"><input type="color" id="f-ac" value="'+hex(S.ac)+'"><button class="ctl-btn" data-act="apply">Apply</button></div>';
};
C.football = function(){
  return '<div class="ctl-row">'+btn(S.home+" +1","hg")+btn(S.home+" -1","hgm")+btn(S.away+" +1","ag")+btn(S.away+" -1","agm")+'</div>' +
  '<div class="ctl-row">'+btn(S.running?"Pause ⏸":"Start ▶","clk")+btn("+1 min","c1")+btn("-1 min","cm1")+btn("Reset","reset","danger")+'</div>' +
  '<div class="ctl-row"><input id="f-home" value="'+esc(S.home)+'" maxlength="8"><input id="f-away" value="'+esc(S.away)+'" maxlength="8"><input id="f-title" value="'+esc(S.title)+'" placeholder="Title"></div>' +
  '<div class="ctl-row"><input type="color" id="f-hc" value="'+hex(S.hc)+'"><input type="color" id="f-ac" value="'+hex(S.ac)+'"><button class="ctl-btn" data-act="apply">Apply</button></div>';
};
C.lowerthird = function(){
  return '<div class="ctl-row">'+btn(S.show?"Hide":"Show","toggle","primary")+'</div>' +
  '<div class="ctl-row"><input id="f-name" value="'+esc(S.name)+'" placeholder="Name"><input id="f-title" value="'+esc(S.title)+'" placeholder="Subtitle"></div>' +
  '<div class="ctl-row"><input type="color" id="f-accent" value="'+hex(S.accent)+'">' +
  '<select id="f-theme"><option value="dark"'+(S.theme!=="light"?" selected":"")+'>Dark</option><option value="light"'+(S.theme==="light"?" selected":"")+'>Light</option></select>' +
  '<button class="ctl-btn" data-act="apply">Apply</button></div>';
};
C.ticker = function(){
  return '<div class="ctl-row"><textarea id="f-heads" rows="4" placeholder="One headline per line">'+esc(S.heads)+'</textarea></div>' +
  '<div class="ctl-row"><input id="f-label" value="'+esc(S.label)+'" maxlength="14"><input id="f-speed" type="number" value="'+S.speed+'" min="5" max="120" title="Speed"></div>' +
  '<div class="ctl-row"><input type="color" id="f-bg" value="'+hex(S.bg)+'"><input type="color" id="f-labelbg" value="'+hex(S.labelbg)+'"><button class="ctl-btn" data-act="apply">Apply</button></div>';
};
C.countdown = function(){
  return '<div class="ctl-row">'+btn(S.running?"Pause ⏸":"Start ▶","tog","primary")+btn("Reset","reset","danger")+'</div>' +
  '<div class="ctl-row"><input id="f-mins" type="number" value="'+S.mins+'" min="1" max="999"><input id="f-title" value="'+esc(S.title)+'"></div>' +
  '<div class="ctl-row"><input type="color" id="f-accent" value="'+hex(S.accent)+'"><button class="ctl-btn" data-act="apply">Apply</button></div>';
};
C.livebug = function(){
  return '<div class="ctl-row"><input id="f-text" value="'+esc(S.text)+'" maxlength="10"><input id="f-size" type="number" value="'+S.size+'" min="16" max="120"><input type="color" id="f-color" value="'+hex(S.color)+'"><button class="ctl-btn" data-act="apply">Apply</button></div>';
};

var clockTimer = null, cdTimer = null;
function stopTimers(){ if(clockTimer){clearInterval(clockTimer);clockTimer=null;} if(cdTimer){clearInterval(cdTimer);cdTimer=null;} }

function renderStage(){
  stopTimers();
  var stage = document.getElementById("stage");
  stage.innerHTML = (R[TYPE]||R.cricket)();
  if (TYPE==="football" && S.running){
    clockTimer = setInterval(function(){ S.clock++; save(); tickClock(); }, 1000);
  }
  if (TYPE==="countdown" && S.running){
    cdTimer = setInterval(function(){
      if (S.remain > 0){ S.remain--; save(); renderStage(); } else { S.running=0; save(); render(); }
    }, 1000);
  }
}
function render(){
  renderStage();
  if (CONTROL) renderDock();
}
function tickClock(){
  var el = document.querySelector(".fb-clock");
  if (el){ var mm=Math.floor(S.clock/60), ss=S.clock%60; el.textContent=(mm<10?"0"+mm:mm)+":"+(ss<10?"0"+ss:ss); }
}
function renderDock(){
  var dock = document.getElementById("dock");
  dock.innerHTML = '<div class="ctl-head">🎛️ '+esc(TYPE.toUpperCase())+' CONTROL <span class="ctl-hint">OBS → right-click source → Interact</span></div>' +
    '<div class="ctl-body">'+((C[TYPE]||C.cricket)())+'</div>';
  dock.querySelectorAll("[data-act]").forEach(function(b){
    b.addEventListener("click", function(){ act(b.getAttribute("data-act")); });
  });
}
function val(id){ var el=document.getElementById(id); return el?el.value:""; }

function addBall(){ S.balls++; if (S.balls>5){ S.balls=0; S.ovr++; } }
function batKey(){ return S.inn===1 ? "hr" : "wr"; }
function wkKey(){ return S.inn===1 ? "hb" : "wb"; }

function act(a){
  switch(a){
    case "r1": S[batKey()]+=1; addBall(); break;
    case "r2": S[batKey()]+=2; addBall(); break;
    case "r3": S[batKey()]+=3; addBall(); break;
    case "r4": S[batKey()]+=4; addBall(); break;
    case "r6": S[batKey()]+=6; addBall(); break;
    case "wk": S[wkKey()]+=1; addBall(); break;
    case "ball": addBall(); break;
    case "wide": S[batKey()]+=1; break;
    case "noball": S[batKey()]+=1; break;
    case "uw": if(S[wkKey()]>0) S[wkKey()]--; break;
    case "i1": S.inn=1; S.ovr=0; S.balls=0; break;
    case "i2": S.inn=2; S.ovr=0; S.balls=0; break;
    case "reset":
      if(TYPE==="cricket"){ S.hr=0;S.wr=0;S.hb=0;S.wb=0;S.ovr=0;S.balls=0;S.inn=1; }
      if(TYPE==="football"){ S.hg=0;S.ag=0;S.clock=0;S.running=0; }
      if(TYPE==="countdown"){ S.remain=S.mins*60; S.running=0; }
      break;
    case "hg": S.hg++; break; case "hgm": if(S.hg>0)S.hg--; break;
    case "ag": S.ag++; break; case "agm": if(S.ag>0)S.ag--; break;
    case "clk": S.running = S.running?0:1; break;
    case "c1": S.clock+=60; break; case "cm1": S.clock=Math.max(0,S.clock-60); break;
    case "toggle": S.show = S.show?0:1; break;
    case "tog": S.running = S.running?0:1; if(S.running && S.remain<=0) S.remain=S.mins*60; break;
    case "apply":
      if(TYPE==="cricket"||TYPE==="football"){ S.home=val("f-home")||S.home; S.away=val("f-away")||S.away; S.hc=val("f-hc"); S.ac=val("f-ac"); S.title=val("f-title"); }
      if(TYPE==="lowerthird"){ S.name=val("f-name"); S.title=val("f-title"); S.accent=val("f-accent"); S.theme=val("f-theme"); }
      if(TYPE==="ticker"){ S.heads=val("f-heads"); S.label=val("f-label"); S.speed=+val("f-speed")||40; S.bg=val("f-bg"); S.labelbg=val("f-labelbg"); }
      if(TYPE==="countdown"){ S.mins=Math.max(1,+val("f-mins")||10); S.remain=S.mins*60; S.running=0; S.title=val("f-title"); S.accent=val("f-accent"); }
      if(TYPE==="livebug"){ S.text=val("f-text")||"LIVE"; S.size=Math.max(16,Math.min(120,+val("f-size")||34)); S.color=val("f-color"); }
      break;
  }
  save(); render();
}

document.addEventListener("DOMContentLoaded", function(){
  document.title = "StreamOverlays — " + TYPE;
  render();
});

/* expose for studio previews */
window.SO = { render:render, getState:function(){return S;}, TYPE:TYPE };
})();
