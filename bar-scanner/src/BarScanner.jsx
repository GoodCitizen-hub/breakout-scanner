import { useState, useRef } from "react";

const WORKER_URL = "https://bar-scanner-worker.james-t-jeter.workers.dev";

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#080c10;--s1:#0d1117;--s2:#131920;--s3:#1a2230;
  --border:rgba(100,160,255,0.08);--border2:rgba(100,160,255,0.15);
  --green:#00e5a0;--green2:rgba(0,229,160,0.12);
  --red:#ff4d6d;--red2:rgba(255,77,109,0.12);
  --blue:#4d9fff;--blue2:rgba(77,159,255,0.1);
  --amber:#ffb347;--amber2:rgba(255,179,71,0.1);
  --text:#c8d8e8;--text2:#6a8aaa;--text3:#3a5a7a;
  --mono:'Space Mono',monospace;--sans:'DM Sans',sans-serif;
  --glow-g:0 0 20px rgba(0,229,160,0.15);
}
body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:14px;-webkit-text-size-adjust:100%}
.app{min-height:100vh;display:flex;flex-direction:column}

/* ── Header ── */
.hdr{display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:48px;background:var(--s1);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:300}
.hdr-logo{font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.15em;color:var(--green);display:flex;align-items:center;gap:8px}
.live-dot{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:var(--glow-g);animation:livepulse 2s ease-in-out infinite;flex-shrink:0}
@keyframes livepulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
.mode-tag{font-family:var(--mono);font-size:8px;letter-spacing:.1em;padding:3px 8px;border-radius:2px;border:1px solid;white-space:nowrap}
.mode-mock{border-color:var(--amber);color:var(--amber);background:var(--amber2)}
.mode-live{border-color:var(--green);color:var(--green);background:var(--green2)}

/* ── Controls (mobile: stacked, desktop: horizontal) ── */
.ctrl-panel{background:var(--s1);border-bottom:1px solid var(--border);padding:10px 14px;display:flex;flex-direction:column;gap:10px}
.ctrl-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ctrl-label{font-family:var(--mono);font-size:9px;letter-spacing:.12em;color:var(--text3);white-space:nowrap;flex-shrink:0}
.range-wrap{display:flex;align-items:center;gap:8px;flex:1;min-width:120px}
.range-wrap input[type=range]{flex:1;accent-color:var(--green);cursor:pointer;min-width:80px}
.range-val{font-family:var(--mono);font-size:11px;color:var(--green);min-width:32px}
.toggle-btn{font-family:var(--mono);font-size:9px;padding:4px 10px;border-radius:2px;border:1px solid var(--border2);color:var(--text2);cursor:pointer;background:transparent;transition:all .12s;white-space:nowrap}
.toggle-btn.on{border-color:rgba(0,229,160,.5);color:var(--green);background:var(--green2)}
.scan-btn{padding:10px 20px;background:var(--green);color:#000;border:none;border-radius:3px;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.15em;cursor:pointer;transition:all .15s;white-space:nowrap;flex-shrink:0}
.scan-btn:hover{background:#00c88a;box-shadow:var(--glow-g)}
.scan-btn:disabled{background:var(--text3);color:var(--s2);cursor:not-allowed;box-shadow:none}
.chip-row{display:flex;flex-wrap:wrap;gap:5px}
.chip{font-family:var(--mono);font-size:9px;letter-spacing:.08em;padding:4px 8px;border-radius:2px;border:1px solid var(--border2);color:var(--text2);cursor:pointer;background:transparent;transition:all .12s;text-transform:uppercase}
.chip.ag{border-color:rgba(0,229,160,.5);color:var(--green);background:var(--green2)}
.chip.ab{border-color:rgba(77,159,255,.5);color:var(--blue);background:var(--blue2)}
.chip.ar{border-color:rgba(255,77,109,.5);color:var(--red);background:var(--red2)}
.chip.aw{border-color:var(--text2);color:var(--text);background:rgba(255,255,255,.04)}

/* ── Counts bar ── */
.counts-bar{display:flex;gap:6px;padding:8px 14px;border-bottom:1px solid var(--border);background:var(--s1)}
.m-card{background:var(--s2);border:1px solid var(--border);border-radius:3px;padding:5px 8px;flex:1;text-align:center;min-width:0}
.m-label{font-family:var(--mono);font-size:7px;letter-spacing:.06em;color:var(--text3);margin-bottom:2px}
.m-val{font-family:var(--mono);font-size:14px;font-weight:700}
.cg{color:var(--green)}.cr{color:var(--red)}.cb{color:var(--blue)}.ca{color:var(--amber)}.cw{color:var(--text)}

/* ── Mobile: full screen views ── */
.mobile-signals{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
.sig-item{padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .1s;-webkit-tap-highlight-color:transparent}
.sig-item:hover,.sig-item:active{background:rgba(77,159,255,.06)}
.sig-item.active{background:rgba(0,229,160,.05);border-left:3px solid var(--green);padding-left:13px}
.sig-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:3px}
.sig-ticker{font-family:var(--mono);font-size:15px;font-weight:700}
.sig-price{font-family:var(--mono);font-size:12px;color:var(--text2)}
.sig-mid{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.sig-sector{font-size:11px;color:var(--text3)}
.pbadge{font-family:var(--mono);font-size:8px;letter-spacing:.08em;padding:3px 7px;border-radius:2px;border:1px solid}
.pb-ib{border-color:rgba(0,229,160,.4);color:var(--green);background:var(--green2)}
.pb-ob{border-color:rgba(77,159,255,.5);color:var(--blue);background:var(--blue2)}
.pb-ibr{border-color:rgba(255,77,109,.4);color:var(--red);background:var(--red2)}
.pb-obr{border-color:rgba(255,179,71,.4);color:var(--amber);background:var(--amber2)}
.conf-row{display:flex;align-items:center;gap:8px}
.conf-track{flex:1;height:3px;background:var(--border2);border-radius:2px;overflow:hidden}
.conf-fill{height:100%;border-radius:2px}
.conf-num{font-family:var(--mono);font-size:10px;min-width:24px;text-align:right}

/* ── Detail panel (mobile: full screen overlay, desktop: right column) ── */
.detail-panel{display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
.back-btn{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--s1);cursor:pointer;font-family:var(--mono);font-size:10px;color:var(--text2);border:none;width:100%;text-align:left;-webkit-tap-highlight-color:transparent}
.back-btn:hover{color:var(--text)}
.main-tabs{display:flex;border-bottom:1px solid var(--border);background:var(--s1);overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.main-tabs::-webkit-scrollbar{display:none}
.mtab{font-family:var(--mono);font-size:10px;letter-spacing:.08em;padding:13px 14px;color:var(--text2);cursor:pointer;border:none;border-bottom:2px solid transparent;transition:all .15s;background:none;text-transform:uppercase;white-space:nowrap;flex-shrink:0}
.mtab.active{color:var(--green);border-bottom-color:var(--green)}
.main-content{flex:1;overflow-y:auto;padding:16px;-webkit-overflow-scrolling:touch}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
.dcard{background:var(--s1);border:1px solid var(--border);border-radius:4px;padding:12px}
.dc-title{font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:var(--text3);margin-bottom:8px;text-transform:uppercase}
.dc-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(100,160,255,0.04)}
.dc-lbl{font-size:11px;color:var(--text2)}
.dc-val{font-family:var(--mono);font-size:11px;color:var(--text)}
.cviz{background:var(--s1);border:1px solid var(--border);border-radius:4px;padding:14px;margin-bottom:12px}
.chart-wrap{display:flex;align-items:flex-end;gap:2px;height:90px;padding:4px 0}
.cbar{flex:1;border-radius:1px;min-width:2px}
.opt-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px}
.ocard{background:var(--s2);border:1px solid var(--border);border-radius:3px;padding:12px}
.ocard.best{border-color:rgba(0,229,160,.4);background:var(--green2)}
.analysis-box{background:var(--s1);border:1px solid var(--border);border-radius:4px;padding:14px;min-height:200px}
.analysis-text{font-size:13px;color:var(--text2);line-height:1.8;white-space:pre-wrap}
.cursor{display:inline-block;width:7px;height:13px;background:var(--green);animation:blink 1s infinite;vertical-align:middle;margin-left:2px}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
.log-box{background:var(--s1);border:1px solid var(--border);border-radius:4px;padding:12px}
.log-line{display:flex;gap:10px;font-family:var(--mono);font-size:10px;line-height:1.8}
.log-t{color:var(--text3);min-width:58px}
.log-m{color:var(--text2)}
.log-m.g{color:var(--green)}.log-m.r{color:var(--red)}.log-m.a{color:var(--amber)}.log-m.b{color:var(--blue)}
.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;font-family:var(--mono);font-size:10px;letter-spacing:.15em;color:var(--text3);gap:10px;text-align:center}
.exec-rule{background:var(--s1);border:1px solid var(--border);border-radius:4px;padding:14px;margin-bottom:14px}
.exec-step{display:flex;gap:10px;padding:5px 0;border-bottom:1px solid rgba(100,160,255,0.04)}
.exec-step:last-child{border-bottom:none}
.step-key{font-family:var(--mono);font-size:10px;color:var(--text3);min-width:52px;flex-shrink:0}
.step-val{font-size:12px;color:var(--text2);line-height:1.6}
.sig-count-label{padding:8px 16px 4px;font-family:var(--mono);font-size:9px;color:var(--text3);letter-spacing:.12em}

/* ── Desktop layout (>768px) ── */
@media(min-width:769px){
  .hdr{height:52px;padding:0 24px}
  .hdr-logo{font-size:11px;letter-spacing:.2em}
  .mode-tag{font-size:9px}
  .ctrl-panel{flex-direction:row;align-items:center;height:56px;padding:0 20px;gap:14px}
  .ctrl-row{flex-wrap:nowrap}
  .ctrl-divider{width:1px;height:28px;background:var(--border2);flex-shrink:0}
  .desktop-layout{display:grid;grid-template-columns:340px 1fr;flex:1;overflow:hidden}
  .desktop-sidebar{background:var(--s1);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;height:100%}
  .desktop-main{display:flex;flex-direction:column;overflow:hidden;height:100%}
  .back-btn{display:none}
  .opt-grid{grid-template-columns:repeat(3,1fr)}
  .detail-grid{grid-template-columns:1fr 1fr}
}

/* ── Mobile: hide desktop elements ── */
@media(max-width:768px){
  .desktop-layout{display:flex;flex-direction:column;flex:1;overflow:hidden}
  .desktop-sidebar{display:flex;flex-direction:column;overflow:hidden}
  .desktop-main{display:flex;flex-direction:column;overflow:hidden}
  .detail-grid{grid-template-columns:1fr}
  .ctrl-divider{display:none}
}

::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--s3);border-radius:2px}
`;

const MOCK_SIGNALS = [
  { ticker:"KHC",  name:"Kraft Heinz",       sector:"Consumer Staples", pattern:"inside-bull",  price:22.52, open:22.10, high:22.80, low:22.15, close:22.52, motherHigh:23.10, motherLow:21.80, motherOpen:21.90, motherClose:23.05, low52:21.04, high52:31.15, pctFromLow:"6.94",  callStrike:"23.50", putStrike:"21.50", confidence:88, daysOut:10, callPremium:"0.12" },
  { ticker:"WBA",  name:"Walgreens Boots",    sector:"Healthcare",       pattern:"outside-bull", price:11.20, open:10.60, high:11.45, low:10.40, close:11.20, motherHigh:11.10, motherLow:10.80, motherOpen:10.90, motherClose:10.95, low52:10.80, high52:21.40, pctFromLow:"3.70",  callStrike:"11.50", putStrike:"10.50", confidence:82, daysOut:7,  callPremium:"0.18" },
  { ticker:"INTC", name:"Intel",              sector:"Technology",       pattern:"inside-bear",  price:21.50, open:21.80, high:21.95, low:21.30, close:21.50, motherHigh:22.40, motherLow:21.00, motherOpen:22.30, motherClose:21.20, low52:20.90, high52:45.20, pctFromLow:"2.87",  callStrike:"22.50", putStrike:"21.00", confidence:79, daysOut:14, callPremium:"0.22" },
  { ticker:"PFE",  name:"Pfizer",             sector:"Healthcare",       pattern:"outside-bear", price:24.80, open:25.40, high:25.60, low:24.50, close:24.80, motherHigh:25.20, motherLow:24.90, motherOpen:25.00, motherClose:25.10, low52:23.80, high52:31.50, pctFromLow:"4.20",  callStrike:"25.50", putStrike:"24.50", confidence:74, daysOut:10, callPremium:"0.15" },
  { ticker:"MO",   name:"Altria Group",       sector:"Consumer Staples", pattern:"inside-bull",  price:44.80, open:44.20, high:45.10, low:44.10, close:44.80, motherHigh:45.80, motherLow:43.60, motherOpen:43.70, motherClose:45.60, low52:43.50, high52:56.30, pctFromLow:"2.99",  callStrike:"46.00", putStrike:"43.50", confidence:85, daysOut:7,  callPremium:"0.35" },
  { ticker:"T",    name:"AT&T",               sector:"Telecom",          pattern:"inside-bull",  price:22.10, open:21.90, high:22.35, low:21.85, close:22.10, motherHigh:22.60, motherLow:21.40, motherOpen:21.50, motherClose:22.50, low52:21.40, high52:24.80, pctFromLow:"3.27",  callStrike:"23.00", putStrike:"21.00", confidence:76, daysOut:14, callPremium:"0.14" },
  { ticker:"F",    name:"Ford Motor",         sector:"Consumer Disc",    pattern:"outside-bull", price:10.80, open:10.20, high:11.05, low:10.10, close:10.80, motherHigh:10.60, motherLow:10.30, motherOpen:10.40, motherClose:10.50, low52:10.50, high52:14.60, pctFromLow:"2.86",  callStrike:"11.00", putStrike:"10.00", confidence:71, daysOut:7,  callPremium:"0.09" },
  { ticker:"MPW",  name:"Medical Properties", sector:"Real Estate",      pattern:"inside-bear",  price:4.80,  open:4.95,  high:4.98,  low:4.72,  close:4.80,  motherHigh:5.10,  motherLow:4.65,  motherOpen:5.05,  motherClose:4.70,  low52:4.60,  high52:8.40,  pctFromLow:"4.35",  callStrike:"5.00",  putStrike:"4.50",  confidence:68, daysOut:10, callPremium:"0.07" },
  { ticker:"AAL",  name:"American Airlines",  sector:"Industrials",      pattern:"outside-bear", price:11.80, open:12.40, high:12.55, low:11.60, close:11.80, motherHigh:12.20, motherLow:11.90, motherOpen:12.10, motherClose:12.00, low52:11.30, high52:17.20, pctFromLow:"4.42",  callStrike:"12.50", putStrike:"11.50", confidence:66, daysOut:7,  callPremium:"0.11" },
  { ticker:"PARA", name:"Paramount Global",   sector:"Comm Services",    pattern:"inside-bull",  price:11.20, open:11.00, high:11.35, low:10.95, close:11.20, motherHigh:11.60, motherLow:10.80, motherOpen:10.85, motherClose:11.50, low52:10.90, high52:16.80, pctFromLow:"2.75",  callStrike:"12.00", putStrike:"10.50", confidence:72, daysOut:14, callPremium:"0.13" },
];

const PM = {
  "inside-bull":  { label:"Inside Bull",  cls:"pb-ib",  dir:"call" },
  "inside-bear":  { label:"Inside Bear",  cls:"pb-ibr", dir:"put"  },
  "outside-bull": { label:"Outside Bull", cls:"pb-ob",  dir:"call" },
  "outside-bear": { label:"Outside Bear", cls:"pb-obr", dir:"put"  },
};

const CHIP_FILTERS = [
  { k:"all",          l:"ALL",  ac:"aw" },
  { k:"inside",       l:"IN",   ac:"ag" },
  { k:"outside",      l:"OUT",  ac:"ab" },
  { k:"inside-bull",  l:"IB↑",  ac:"ag" },
  { k:"inside-bear",  l:"IB↓",  ac:"ar" },
  { k:"outside-bull", l:"OB↑",  ac:"ab" },
  { k:"outside-bear", l:"OB↓",  ac:"ar" },
];

function confColor(n){ return n>=80?"var(--green)":n>=65?"var(--amber)":"var(--red)"; }
function fmt(n,d=2){ return Number(n).toFixed(d); }
function ts(){ return new Date().toTimeString().slice(0,8); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function gen5mBars(price){
  const bars=[];let p=price*0.992;
  for(let i=0;i<78;i++){
    const o=p,c=o+(Math.random()-0.47)*(price*0.003);
    const h=Math.max(o,c)+Math.random()*price*0.001;
    const l=Math.min(o,c)-Math.random()*price*0.001;
    bars.push({o:+o.toFixed(2),h:+h.toFixed(2),l:+l.toFixed(2),c:+c.toFixed(2),v:80000});
    p=c;
  }
  return bars;
}

function genMockOptions(sig){
  const dir=PM[sig.pattern].dir;
  const base=dir==="call"?parseFloat(sig.callStrike):parseFloat(sig.putStrike);
  return [7,10,14,21,30].map((days,i)=>({
    strike:+(base+(dir==="call"?i*0.5:-i*0.5)).toFixed(2),
    expiry:new Date(Date.now()+days*86400000).toISOString().split("T")[0],
    contractType:dir,daysToExpiry:days,
    premium:+(parseFloat(sig.callPremium)+i*0.04).toFixed(2)
  }));
}

export default function BarScanner(){
  const [signals,   setSignals]   = useState([]);
  const [scanning,  setScanning]  = useState(false);
  const [scanDone,  setScanDone]  = useState(false);
  const [selected,  setSelected]  = useState(null);
  const [showDetail,setShowDetail]= useState(false); // mobile: show detail panel
  const [activeTab, setActiveTab] = useState("detail");
  const [analysis,  setAnalysis]  = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [bars5m,    setBars5m]    = useState([]);
  const [options,   setOptions]   = useState([]);
  const [logs,      setLogs]      = useState([]);
  const [nearLow,   setNearLow]   = useState(15);
  const [useLowFilter, setUseLowFilter] = useState(false); // OFF by default
  const [filterPat, setFilterPat] = useState("all");
  const [mode,      setMode]      = useState("mock");
  const analysisRef = useRef("");
  const logsEndRef  = useRef(null);

  function addLog(msg,type=""){
    setLogs(p=>[...p.slice(-80),{t:ts(),msg,type}]);
    setTimeout(()=>logsEndRef.current?.scrollIntoView({behavior:"smooth"}),50);
  }

  async function runScan(){
    setScanning(true);setScanDone(false);
    setSignals([]);setSelected(null);setShowDetail(false);
    setAnalysis("");setBars5m([]);setOptions([]);setLogs([]);
    addLog("Connecting to Worker...","b");

    // Pass nearLow=100 when filter is off (returns all signals)
    const effectiveNearLow = useLowFilter ? nearLow : 100;

    try{
      const res=await fetch(`${WORKER_URL}/scan?nearLow=${effectiveNearLow}&pattern=${filterPat}`);
      if(!res.ok) throw new Error(`Worker ${res.status}`);
      const data=await res.json();
      setMode(data.mode);
      for(const s of data.signals){
        await sleep(50);
        addLog(`${s.ticker} → ${PM[s.pattern].label} | conf:${s.confidence}`,"g");
      }
      addLog(`Scan complete — ${data.signalCount} signal(s) | ${data.mode==="live"?"LIVE":"MOCK"}`,data.mode==="live"?"g":"a");
      setSignals(data.signals);
    }catch(e){
      addLog(`Worker unavailable — using mock data`,"a");
      let results=MOCK_SIGNALS.filter(s=>{
        if(filterPat==="all") return true;
        if(filterPat==="inside") return s.pattern.startsWith("inside");
        if(filterPat==="outside") return s.pattern.startsWith("outside");
        return s.pattern===filterPat;
      });
      if(useLowFilter) results=results.filter(s=>parseFloat(s.pctFromLow)<=nearLow);
      for(const s of results){await sleep(50);addLog(`${s.ticker} → ${PM[s.pattern].label} | conf:${s.confidence}`,"g");}
      addLog(`Scan complete — ${results.length} signal(s) (mock)`,"a");
      setMode("mock");
      setSignals(results.sort((a,b)=>b.confidence-a.confidence));
    }
    setScanning(false);setScanDone(true);
  }

  async function selectSignal(sig){
    setSelected(sig);setShowDetail(true);
    setActiveTab("detail");setAnalysis("");analysisRef.current="";
    addLog(`Selected ${sig.ticker}...`,"b");
    try{
      const [bRes,oRes]=await Promise.allSettled([
        fetch(`${WORKER_URL}/bars?ticker=${sig.ticker}`).then(r=>r.json()),
        fetch(`${WORKER_URL}/options?ticker=${sig.ticker}&direction=${PM[sig.pattern].dir}`).then(r=>r.json()),
      ]);
      setBars5m(bRes.status==="fulfilled"?bRes.value.bars:gen5mBars(sig.price));
      setOptions(oRes.status==="fulfilled"?oRes.value.options:genMockOptions(sig));
    }catch{setBars5m(gen5mBars(sig.price));setOptions(genMockOptions(sig));}
    await streamAnalysis(sig);
  }

  async function streamAnalysis(sig){
    setAnalyzing(true);analysisRef.current="";
    const dir=PM[sig.pattern].dir;
    const prompt=`You are an elite options trader. Analyze this signal with exact prices. Be direct.

${sig.ticker} (${sig.name}) — ${sig.sector}
Pattern: ${sig.pattern} on 1D
Price: $${sig.price} | 52W Low: $${sig.low52} | Distance: ${sig.pctFromLow}%
Mother bar: H$${sig.motherHigh} / L$${sig.motherLow}
Current bar: H$${sig.high} / L$${sig.low} / Close $${sig.close}
${sig.pattern.startsWith("inside")?`Inside bar: ${fmt((sig.high-sig.low)/(sig.motherHigh-sig.motherLow)*100,0)}% of mother`:`Outside bar engulfs ${fmt((sig.high-sig.low)/(sig.motherHigh-sig.motherLow)*100,0)}% of prior`}
Option: ${dir.toUpperCase()} $${dir==="call"?sig.callStrike:sig.putStrike} | ~$${sig.callPremium} | ${sig.daysOut}d
Confidence: ${sig.confidence}/99

Answer:
1. SETUP QUALITY — one sentence
2. 1D ENTRY TRIGGER — exact price
3. 5-MIN EXECUTION — how to time entry
4. STOP LOSS — exact level
5. OPTION PLAY — entry, target, max loss
6. KEY RISK — one sentence`;

    try{
      const res=await fetch(`${WORKER_URL}/analyze`,{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(sig)
      });
      const reader=res.body.getReader();const dec=new TextDecoder();
      while(true){
        const {done,value}=await reader.read();if(done)break;
        for(const line of dec.decode(value).split("\n")){
          if(!line.startsWith("data: ")) continue;
          try{const d=JSON.parse(line.slice(6));
            if(d.type==="content_block_delta"&&d.delta?.text){
              analysisRef.current+=d.delta.text;setAnalysis(analysisRef.current);
            }
          }catch{}
        }
      }
      addLog(`AI analysis complete`,"g");
    }catch(e){
      setAnalysis("⚠ AI analysis unavailable. Check Worker deployment.");
      addLog("AI stream error","r");
    }
    setAnalyzing(false);
  }

  const counts={
    total:signals.length,
    ib:signals.filter(s=>s.pattern==="inside-bull").length,
    ibr:signals.filter(s=>s.pattern==="inside-bear").length,
    ob:signals.filter(s=>s.pattern==="outside-bull").length,
    obr:signals.filter(s=>s.pattern==="outside-bear").length,
  };

  const sig=selected;
  const dir=sig?PM[sig.pattern].dir:"call";

  function CandleViz({sig}){
    const mRange=sig.motherHigh-sig.motherLow||1;
    const sc=n=>Math.max(3,(n/mRange)*72);
    const mBull=sig.motherClose>sig.motherOpen;
    const cBull=sig.close>sig.open;
    const mk=(o,c,h,l)=>({bodyH:sc(Math.abs(c-o)),wickT:sc(h-Math.max(o,c)),wickB:sc(Math.min(o,c)-l)});
    const m=mk(sig.motherOpen,sig.motherClose,sig.motherHigh,sig.motherLow);
    const c=mk(sig.open,sig.close,sig.high,sig.low);
    const Candle=({b,bull,label,hi,lo})=>(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"5px"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",height:"88px",justifyContent:"flex-end"}}>
          <div style={{width:"1px",height:`${b.wickT}px`,background:"var(--text2)"}}/>
          <div style={{width:"30px",height:`${b.bodyH}px`,background:bull?"var(--green)":"var(--red)",borderRadius:"1px",opacity:.9}}/>
          <div style={{width:"1px",height:`${b.wickB}px`,background:"var(--text2)"}}/>
        </div>
        <div style={{fontFamily:"var(--mono)",fontSize:"9px",color:"var(--text3)"}}>{label}</div>
        <div style={{fontFamily:"var(--mono)",fontSize:"8px",color:"var(--text3)"}}>H:{fmt(hi)} L:{fmt(lo)}</div>
      </div>
    );
    return(
      <div className="cviz">
        <div className="dc-title" style={{marginBottom:"12px"}}>PATTERN — 1D</div>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:"32px",height:"110px"}}>
          <Candle b={m} bull={mBull} label="MOTHER" hi={sig.motherHigh} lo={sig.motherLow}/>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingBottom:"28px",gap:"3px"}}>
            <div style={{fontFamily:"var(--mono)",fontSize:"9px",color:"var(--text3)"}}>{sig.pattern.startsWith("inside")?"⊂":"⊃"}</div>
          </div>
          <Candle b={c} bull={cBull} label="CURRENT" hi={sig.high} lo={sig.low}/>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:"20px",marginTop:"10px",fontFamily:"var(--mono)",fontSize:"9px",color:"var(--text3)"}}>
          <span>{sig.pattern.startsWith("inside")?`${fmt((sig.high-sig.low)/mRange*100,0)}% compression`:`${fmt((sig.high-sig.low)/mRange*100,0)}% engulf`}</span>
          <span style={{color:confColor(sig.confidence)}}>Conf: {sig.confidence}/99</span>
        </div>
      </div>
    );
  }

  function Chart5m({bars}){
    if(!bars||!bars.length) return null;
    const prices=bars.flatMap(b=>[b.l,b.h]);
    const mn=Math.min(...prices),mx=Math.max(...prices),rng=mx-mn||1;
    return(
      <div className="cviz" style={{marginBottom:"12px"}}>
        <div className="dc-title" style={{marginBottom:"8px"}}>5-MIN CHART — {bars.length} bars</div>
        <div className="chart-wrap">
          {bars.map((b,i)=>(
            <div key={i} className="cbar" style={{height:`${Math.max(2,((b.h-b.l)/rng)*86)}px`,background:b.c>=b.o?"var(--green)":"var(--red)",opacity:.75}}/>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:"6px",fontFamily:"var(--mono)",fontSize:"9px",color:"var(--text3)"}}>
          <span>${fmt(mn)}</span><span style={{color:"var(--text2)"}}>Wait for 5-min IB at trigger → enter</span><span>${fmt(mx)}</span>
        </div>
      </div>
    );
  }

  // Signal list (shared between mobile + desktop)
  const SignalList=()=>(
    <>
      <div className="sig-count-label">
        {scanDone?`${signals.length} SIGNALS — TAP TO ANALYZE`:"PRESS RUN SCAN"}
      </div>
      <div className="mobile-signals">
        {!scanDone&&!scanning&&<div className="empty-state"><span>PRESS ▶ RUN SCAN</span><span style={{fontSize:"9px"}}>1D INSIDE + OUTSIDE BARS</span></div>}
        {scanning&&<div className="empty-state"><span style={{color:"var(--green)"}}>SCANNING...</span><span style={{fontSize:"9px",color:"var(--text3)"}}>S&P 500 · LIVE DATA</span></div>}
        {signals.map(s=>(
          <div key={s.ticker} className={`sig-item ${selected?.ticker===s.ticker?"active":""}`} onClick={()=>selectSignal(s)}>
            <div className="sig-top">
              <span className="sig-ticker">{s.ticker}</span>
              <span className="sig-price">${fmt(s.price)}</span>
            </div>
            <div className="sig-mid">
              <span className="sig-sector">{s.sector}</span>
              <span className={`pbadge ${PM[s.pattern].cls}`}>{PM[s.pattern].label}</span>
            </div>
            <div className="conf-row">
              <div className="conf-track"><div className="conf-fill" style={{width:`${s.confidence}%`,background:confColor(s.confidence)}}/></div>
              <span className="conf-num" style={{color:confColor(s.confidence)}}>{s.confidence}</span>
              <span style={{fontFamily:"var(--mono)",fontSize:"9px",color:"var(--amber)",marginLeft:"4px"}}>+{fmt(s.pctFromLow,1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // Detail panel content
  const DetailContent=()=>!sig?null:(
    <>
      <div className="main-tabs">
        {[{k:"detail",l:"SETUP"},{k:"5min",l:"5-MIN"},{k:"options",l:"OPTIONS"},{k:"ai",l:"AI"},{k:"log",l:"LOG"}].map(t=>(
          <button key={t.k} className={`mtab ${activeTab===t.k?"active":""}`} onClick={()=>setActiveTab(t.k)}>{t.l}</button>
        ))}
      </div>
      <div className="main-content">
        {activeTab==="detail"&&(
          <>
            <CandleViz sig={sig}/>
            <div className="detail-grid">
              <div className="dcard">
                <div className="dc-title">Pattern</div>
                {[
                  ["Pattern",<span className={`pbadge ${PM[sig.pattern].cls}`}>{PM[sig.pattern].label}</span>],
                  ["Confidence",<span style={{color:confColor(sig.confidence)}}>{sig.confidence}/99</span>],
                  ["Mother H","$"+fmt(sig.motherHigh)],["Mother L","$"+fmt(sig.motherLow)],
                  ["Bar H","$"+fmt(sig.high)],["Bar L","$"+fmt(sig.low)],
                  ["52W Low","$"+fmt(sig.low52)],["From Low",<span className="ca">+{fmt(sig.pctFromLow,1)}%</span>],
                ].map(([k,v])=>(<div key={k} className="dc-row"><span className="dc-lbl">{k}</span><span className="dc-val">{v}</span></div>))}
              </div>
              <div className="dcard">
                <div className="dc-title">Trade Levels</div>
                {[
                  ["1D Trigger",<span className="cg">${fmt(sig.pattern.includes("bull")?sig.motherHigh:sig.motherLow)}</span>],
                  ["Stop Loss",<span className="cr">${fmt(sig.pattern.includes("bull")?sig.motherLow:sig.motherHigh)}</span>],
                  ["Direction",<span className={dir==="call"?"cg":"cr"}>{dir.toUpperCase()}</span>],
                  ["Strike",<span className="cg">${fmt(dir==="call"?sig.callStrike:sig.putStrike)}</span>],
                  ["Premium",<span className="cg">~${sig.callPremium}</span>],
                  ["Expiry",`${sig.daysOut}d out`],
                  ["Max Loss",<span className="cr">${fmt(parseFloat(sig.callPremium)*100)}/contract</span>],
                  ["Execute",<span className="cb">5-MIN CHART</span>],
                ].map(([k,v])=>(<div key={k} className="dc-row"><span className="dc-lbl">{k}</span><span className="dc-val">{v}</span></div>))}
              </div>
            </div>
          </>
        )}
        {activeTab==="5min"&&(
          <>
            <Chart5m bars={bars5m}/>
            <div className="exec-rule">
              <div className="dc-title" style={{marginBottom:"8px"}}>EXECUTION PROTOCOL</div>
              {[
                ["Step 1","Confirm 1D candle closes as "+PM[sig.pattern].label],
                ["Step 2",`Open ${sig.ticker} 5-min chart`],
                ["Step 3",`Watch $${fmt(sig.pattern.includes("bull")?sig.motherHigh:sig.motherLow)} — daily trigger`],
                ["Step 4","Wait for 5-min consolidation at that level"],
                ["Step 5","Enter on 5-min breakout"],
                ["Step 6",`Buy ${dir.toUpperCase()} $${fmt(dir==="call"?sig.callStrike:sig.putStrike)}`],
                ["Stop",`Exit if closes through $${fmt(sig.pattern.includes("bull")?sig.motherLow:sig.motherHigh)}`],
              ].map(([k,v])=>(<div key={k} className="exec-step"><span className="step-key">{k}</span><span className="step-val">{v}</span></div>))}
            </div>
          </>
        )}
        {activeTab==="options"&&(
          <>
            <div className="dc-title" style={{marginBottom:"10px"}}>{dir.toUpperCase()} OPTIONS — above ${fmt(dir==="call"?sig.motherHigh:sig.motherLow)}</div>
            <div className="opt-grid">
              {options.map((o,i)=>(
                <div key={i} className={`ocard ${i===0?"best":""}`}>
                  {i===0&&<div style={{fontFamily:"var(--mono)",fontSize:"8px",color:"var(--green)",marginBottom:"3px"}}>★ SUGGESTED</div>}
                  <div style={{fontFamily:"var(--mono)",fontSize:"15px",fontWeight:700}}>${fmt(o.strike)}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:"9px",color:"var(--text3)",margin:"2px 0"}}>{o.expiry}</div>
                  <div style={{fontSize:"10px",color:"var(--text3)"}}>{o.daysToExpiry}d</div>
                  {o.premium&&<div style={{fontFamily:"var(--mono)",fontSize:"12px",color:"var(--green)",marginTop:"4px"}}>${fmt(o.premium)}</div>}
                </div>
              ))}
            </div>
            <div style={{fontFamily:"var(--mono)",fontSize:"9px",color:"var(--text3)",lineHeight:"1.8",background:"var(--s1)",border:"1px solid var(--border)",borderRadius:"4px",padding:"10px"}}>
              Buy cheapest strike just outside mother bar range.<br/>
              Enter ONLY after 1D candle confirms breakout.<br/>
              Risk max 1-2% of account per trade.
            </div>
          </>
        )}
        {activeTab==="ai"&&(
          <div className="analysis-box">
            <div className="dc-title" style={{marginBottom:"10px",display:"flex",alignItems:"center",gap:"8px"}}>
              AI — {sig.ticker} · {PM[sig.pattern].label}
              {analyzing&&<span className="cursor"/>}
            </div>
            {!analysis&&!analyzing&&<div style={{color:"var(--text3)",fontFamily:"var(--mono)",fontSize:"10px",padding:"20px 0",textAlign:"center"}}>TAP A SIGNAL TO TRIGGER ANALYSIS</div>}
            <div className="analysis-text">{analysis}{analyzing&&<span className="cursor"/>}</div>
          </div>
        )}
        {activeTab==="log"&&(
          <div className="log-box">
            {logs.length===0&&<div style={{fontFamily:"var(--mono)",fontSize:"10px",color:"var(--text3)"}}>— awaiting scan —</div>}
            {logs.map((l,i)=>(<div key={i} className="log-line"><span className="log-t">{l.t}</span><span className={`log-m ${l.type}`}>{l.msg}</span></div>))}
            <div ref={logsEndRef}/>
          </div>
        )}
      </div>
    </>
  );

  return(
    <>
      <style>{STYLE}</style>
      <div className="app">
        {/* Header */}
        <div className="hdr">
          <div className="hdr-logo"><div className="live-dot"/>BAR_SCANNER // S&P 500 · 1D</div>
          <span className={`mode-tag ${mode==="live"?"mode-live":"mode-mock"}`}>
            {mode==="live"?"● LIVE":"◌ MOCK"}
          </span>
        </div>

        {/* Controls */}
        <div className="ctrl-panel">
          <div className="ctrl-row">
            <span className="ctrl-label">PATTERN</span>
            <div className="chip-row">
              {CHIP_FILTERS.map(f=>(
                <button key={f.k} className={`chip ${filterPat===f.k?f.ac:""}`} onClick={()=>setFilterPat(f.k)}>{f.l}</button>
              ))}
            </div>
          </div>
          <div className="ctrl-row">
            <button
              className={`toggle-btn ${useLowFilter?"on":""}`}
              onClick={()=>setUseLowFilter(v=>!v)}>
              {useLowFilter?"52W LOW ON":"52W LOW OFF"}
            </button>
            {useLowFilter&&(
              <div className="range-wrap">
                <input type="range" min={1} max={100} step={1} value={nearLow} onChange={e=>setNearLow(Number(e.target.value))}/>
                <span className="range-val">{nearLow}%</span>
              </div>
            )}
            <div className="ctrl-divider"/>
            <button className="scan-btn" onClick={runScan} disabled={scanning}>
              {scanning?"SCANNING...":"▶ RUN SCAN"}
            </button>
          </div>
        </div>

        {/* Counts */}
        <div className="counts-bar">
          <div className="m-card"><div className="m-label">TOTAL</div><div className="m-val cw">{counts.total}</div></div>
          <div className="m-card"><div className="m-label">IB↑</div><div className="m-val cg">{counts.ib}</div></div>
          <div className="m-card"><div className="m-label">IB↓</div><div className="m-val cr">{counts.ibr}</div></div>
          <div className="m-card"><div className="m-label">OB↑</div><div className="m-val cb">{counts.ob}</div></div>
          <div className="m-card"><div className="m-label">OB↓</div><div className="m-val ca">{counts.obr}</div></div>
        </div>

        {/* Main layout — responsive */}
        <div className="desktop-layout" style={{flex:1,overflow:"hidden"}}>

          {/* Signal list — hidden on mobile when detail is showing */}
          <div className="desktop-sidebar" style={{display: showDetail?"none":"flex",flexDirection:"column",overflow:"hidden"}}>
            <SignalList/>
          </div>

          {/* Detail panel — full screen on mobile, right column on desktop */}
          {sig&&(
            <div className="detail-panel" style={{display: !showDetail?"none":"flex",flexDirection:"column",overflow:"hidden",flex:1}}>
              <button className="back-btn" onClick={()=>setShowDetail(false)}>
                ← Back to signals
              </button>
              <DetailContent/>
            </div>
          )}

          {/* Desktop: always show both columns */}
          <style>{`
            @media(min-width:769px){
              .desktop-sidebar{display:flex!important;width:340px;flex-shrink:0}
              .detail-panel{display:flex!important;flex:1}
            }
          `}</style>
        </div>
      </div>
    </>
  );
}
