/**
 * BAR SCANNER — Cloudflare Worker
 * Massive.com (formerly Polygon.io) backend
 * Base URL: https://api.massive.com
 *
 * Secrets (set in Cloudflare dashboard → Workers → Settings → Variables):
 *   MASSIVE_API_KEY   — your Massive.com default key
 *   ANTHROPIC_API_KEY — your Anthropic key
 *
 * Endpoints:
 *   GET  /scan        — full S&P 500 scan for inside/outside bars
 *   GET  /bars        — 5-min intraday bars for a ticker
 *   GET  /options     — options chain for a ticker
 *   POST /analyze     — streaming AI analysis
 */

const BASE = "https://api.massive.com";

// ── S&P 500 symbols ───────────────────────────────────────────────────────────
// Full list — expand to all 503 in production
const SP500 = [
  "AAPL","MSFT","NVDA","AMZN","META","GOOGL","GOOG","LLY","AVGO","JPM",
  "TSLA","UNH","V","XOM","MA","PG","COST","JNJ","HD","MRK",
  "ABBV","BAC","CVX","KO","PEP","ADBE","CRM","TMO","AMD","ACN",
  "NFLX","WMT","MCD","ABT","DHR","TXN","CSCO","PM","NKE","NEE",
  "ORCL","RTX","AMGN","UPS","QCOM","IBM","HON","COP","CAT","GS",
  "LOW","INTU","SPGI","SBUX","AXP","BA","DE","ISRG","GE","NOW",
  "SYK","AMAT","ADI","BLK","VRTX","MDLZ","REGN","ZTS","TJX","C",
  "MMC","PGR","PANW","MO","DUK","SO","BSX","USB","WM","INTC",
  "F","KHC","WBA","PFE","CVS","T","VZ","AAL","UAL","DAL",
  "PARA","DIS","MPW","LVS","GM","COIN","PLTR","SOFI","UBER","HOOD",
  "SQ","PYPL","SHOP","ETSY","ROKU","CRWD","SNAP","PINS","LYFT","RIVN"
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

// ── Main handler ──────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url  = new URL(request.url);
    const path = url.pathname;

    // Detect mock mode — runs when no key is set
    const MOCK = !env.MASSIVE_API_KEY || env.MASSIVE_API_KEY === "YOUR_KEY_HERE";

    try {
      if (path === "/scan"    && request.method === "GET")  return await handleScan(url, env, MOCK);
      if (path === "/bars"    && request.method === "GET")  return await handleBars(url, env, MOCK);
      if (path === "/options" && request.method === "GET")  return await handleOptions(url, env, MOCK);
      if (path === "/analyze" && request.method === "POST") return await handleAnalyze(request, env);
      return err("Not found", 404);
    } catch (e) {
      return err(`Worker error: ${e.message}`, 500);
    }
  }
};

// ── /scan ─────────────────────────────────────────────────────────────────────
async function handleScan(url, env, MOCK) {
  const nearLow   = parseFloat(url.searchParams.get("nearLow") || "8");
  const filterPat = url.searchParams.get("pattern") || "all";

  const signals = MOCK
    ? getMockSignals(nearLow, filterPat)
    : await scanLive(env.MASSIVE_API_KEY, nearLow, filterPat);

  return ok({ signals, mode: MOCK ? "mock" : "live", universe: SP500.length, signalCount: signals.length, scannedAt: new Date().toISOString() });
}

// ── Live scan via Massive API ─────────────────────────────────────────────────
async function scanLive(key, nearLow, filterPat) {
  const signals = [];

  // Find last two real trading days — works on weekends, holidays, any time of day
  const [dateStr, prevDate] = await getLastTwoTradingDays(key);

  // Fetch today and yesterday in parallel — need 2 daily bars per symbol
  const [todayRes, prevRes] = await Promise.all([
    massiveFetch(`/v2/aggs/grouped/locale/us/market/stocks/${dateStr}?adjusted=true`, key),
    massiveFetch(`/v2/aggs/grouped/locale/us/market/stocks/${prevDate}?adjusted=true`, key),
  ]);

  if (!todayRes.results || !prevRes.results) return signals;

  // Index both days by ticker for O(1) lookup
  const todayMap = {};
  const prevMap  = {};
  for (const r of todayRes.results)  todayMap[r.T] = r;
  for (const r of prevRes.results)   prevMap[r.T]  = r;

  // Also fetch 52-week snapshot for the symbols we care about
  // Batch fetch snapshots: GET /v2/snapshot/locale/us/markets/stocks/tickers?tickers=AAPL,MSFT,...
  const snapshotRes = await massiveFetch(
    `/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${SP500.join(",")}`, key
  );
  const snapMap = {};
  for (const t of (snapshotRes.tickers || [])) snapMap[t.ticker] = t;

  for (const ticker of SP500) {
    const curr = todayMap[ticker];
    const prev = prevMap[ticker];
    if (!curr || !prev) continue;

    // Map grouped response fields: T=ticker, o=open, h=high, l=low, c=close, v=volume
    const currBar = { o: curr.o, h: curr.h, l: curr.l, c: curr.c, v: curr.v };
    const prevBar = { o: prev.o, h: prev.h, l: prev.l, c: prev.c, v: prev.v };

    // 52-week low from snapshot
    const snap   = snapMap[ticker] || {};
    const low52  = snap.min?.price || snap.prevDay?.l || currBar.l;
    const high52 = snap.max?.price || snap.prevDay?.h || currBar.h;

    const pctFromLow = ((currBar.c - low52) / low52) * 100;
    if (pctFromLow > nearLow) continue;

    const pattern = detectPattern(prevBar, currBar);
    if (!pattern) continue;
    if (filterPat !== "all" && !matchesFilter(pattern, filterPat)) continue;

    const callStrike = +(Math.ceil(prevBar.h / 0.5) * 0.5).toFixed(2);
    const putStrike  = +(Math.floor(prevBar.l / 0.5) * 0.5).toFixed(2);

    signals.push({
      ticker,
      sector:       "—",
      pattern,
      price:        currBar.c,
      open:         currBar.o,
      high:         currBar.h,
      low:          currBar.l,
      close:        currBar.c,
      volume:       currBar.v,
      motherHigh:   prevBar.h,
      motherLow:    prevBar.l,
      motherOpen:   prevBar.o,
      motherClose:  prevBar.c,
      low52:        +low52.toFixed(2),
      high52:       +high52.toFixed(2),
      pctFromLow:   pctFromLow.toFixed(2),
      callStrike:   callStrike.toFixed(2),
      putStrike:    putStrike.toFixed(2),
      confidence:   calcConfidence(prevBar, currBar, pattern, pctFromLow),
      callPremium:  "—",
      daysOut:      10,
    });
  }

  return signals.sort((a, b) => b.confidence - a.confidence);
}

// ── /bars — 5-min intraday ────────────────────────────────────────────────────
async function handleBars(url, env, MOCK) {
  const ticker = url.searchParams.get("ticker");
  if (!ticker) return err("ticker required", 400);

  if (MOCK) return ok({ bars: genMock5m(22), mode: "mock" });

  const today = toDateStr(new Date());

  // Endpoint: GET /v2/aggs/ticker/{ticker}/range/5/minute/{from}/{to}
  const data = await massiveFetch(
    `/v2/aggs/ticker/${ticker}/range/5/minute/${today}/${today}?adjusted=true&sort=asc&limit=200`,
    env.MASSIVE_API_KEY
  );

  const bars = (data.results || []).map(b => ({
    t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v
  }));

  return ok({ bars, mode: "live" });
}

// ── /options — options chain ──────────────────────────────────────────────────
async function handleOptions(url, env, MOCK) {
  const ticker    = url.searchParams.get("ticker");
  const direction = url.searchParams.get("direction") || "call";
  if (!ticker) return err("ticker required", 400);

  if (MOCK) return ok({ options: genMockOptions(ticker, direction), mode: "mock" });

  const today  = toDateStr(new Date());
  const expTo  = toDateStr(new Date(Date.now() + 30 * 86400000));

  // Endpoint: GET /v3/reference/options/contracts
  const data = await massiveFetch(
    `/v3/reference/options/contracts?underlying_ticker=${ticker}&contract_type=${direction}&expiration_date.gte=${today}&expiration_date.lte=${expTo}&limit=10&sort=expiration_date&order=asc`,
    env.MASSIVE_API_KEY
  );

  const options = (data.results || []).map(o => ({
    strike:        o.strike_price,
    expiry:        o.expiration_date,
    contractType:  o.contract_type,
    daysToExpiry:  Math.round((new Date(o.expiration_date) - new Date()) / 86400000),
    premium:       null, // requires Options Starter for live premiums
  }));

  return ok({ options, mode: "live" });
}

// ── /analyze — streaming AI ───────────────────────────────────────────────────
async function handleAnalyze(request, env) {
  const signal = await request.json();
  const dir    = signal.pattern.includes("bull") ? "call" : "put";

  const prompt = `You are an elite options trader. Analyze this 1D bar pattern signal. Be direct, use exact prices.

Ticker: ${signal.ticker} | Pattern: ${signal.pattern} | Price: $${signal.price}
Mother bar: H$${signal.motherHigh} / L$${signal.motherLow}
Current bar: H$${signal.high} / L$${signal.low} / Close $${signal.close}
${signal.pattern.startsWith("inside")
  ? `Inside bar compression: ${((signal.high-signal.low)/(signal.motherHigh-signal.motherLow)*100).toFixed(0)}% of mother range`
  : `Outside bar engulfs: ${((signal.high-signal.low)/(signal.motherHigh-signal.motherLow)*100).toFixed(0)}% of prior range`}
52W Low: $${signal.low52} | Distance: ${signal.pctFromLow}%
Option: ${dir.toUpperCase()} $${dir==="call"?signal.callStrike:signal.putStrike} | ${signal.daysOut}d out
Confidence: ${signal.confidence}/99

Answer exactly:
1. SETUP QUALITY — one sentence
2. 1D ENTRY TRIGGER — exact price ($X.XX)
3. 5-MIN EXECUTION — how to time entry on 5-min chart
4. STOP LOSS — exact level and reason
5. OPTION PLAY — entry cost, target, max loss per contract
6. KEY RISK — one sentence`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 800,
      stream:     true,
      messages:   [{ role: "user", content: prompt }]
    })
  });

  return new Response(res.body, {
    headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" }
  });
}

// ── Pattern detection ─────────────────────────────────────────────────────────
function detectPattern(prev, curr) {
  const inside  = curr.h <= prev.h && curr.l >= prev.l;
  const outside = curr.h >  prev.h && curr.l <  prev.l;

  if (inside) {
    const bullish = curr.c > prev.c || curr.c > (prev.l + (prev.h - prev.l) * 0.5);
    return bullish ? "inside-bull" : "inside-bear";
  }
  if (outside) {
    const bullish = curr.c > prev.o && curr.c > prev.c;
    return bullish ? "outside-bull" : "outside-bear";
  }
  return null;
}

function matchesFilter(pattern, filter) {
  if (filter === "inside")       return pattern.startsWith("inside");
  if (filter === "outside")      return pattern.startsWith("outside");
  return pattern === filter;
}

// ── Confidence score ──────────────────────────────────────────────────────────
function calcConfidence(prev, curr, pattern, pctFromLow) {
  let score = 50;
  const range    = prev.h - prev.l || 1;
  const bodyRatio = Math.abs(prev.c - prev.o) / range;

  if (bodyRatio > 0.6) score += 10;
  if (bodyRatio > 0.8) score += 5;

  if (pctFromLow <= 1) score += 20;
  else if (pctFromLow <= 2) score += 15;
  else if (pctFromLow <= 3) score += 10;
  else if (pctFromLow <= 5) score += 5;

  if (pattern.startsWith("inside")) {
    const compression = (curr.h - curr.l) / range;
    if (compression < 0.3) score += 15;
    else if (compression < 0.5) score += 8;
  }

  if (pattern.startsWith("outside")) {
    const pos = (curr.c - curr.l) / (curr.h - curr.l || 1);
    if (pattern === "outside-bull" && pos > 0.8)  score += 15;
    if (pattern === "outside-bull" && pos > 0.6)  score += 8;
    if (pattern === "outside-bear" && pos < 0.2)  score += 15;
    if (pattern === "outside-bear" && pos < 0.4)  score += 8;
  }

  return Math.min(99, Math.max(40, Math.round(score)));
}

// ── Massive fetch helper ──────────────────────────────────────────────────────
async function massiveFetch(path, key) {
  const res  = await fetch(`${BASE}${path}`, {
    headers: { "Authorization": `Bearer ${key}` }
  });
  if (!res.ok) throw new Error(`Massive API ${res.status}: ${path}`);
  return res.json();
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function toDateStr(d) {
  return d.toISOString().split("T")[0];
}

// Walk back from a date until we find a weekday (Mon-Fri)
// Excludes weekends — holiday handling done by checking Massive response
function prevWeekday(d) {
  const prev = new Date(d);
  do {
    prev.setDate(prev.getDate() - 1);
  } while (prev.getDay() === 0 || prev.getDay() === 6); // skip Sun, Sat
  return prev;
}

// Find the last two real trading days by asking Massive
// Walks back up to 7 days to skip weekends and market holidays
async function getLastTwoTradingDays(key) {
  const found = [];
  let candidate = new Date();
  // Start from yesterday if today is weekend or not yet closed
  const hour = candidate.getUTCHours();
  const day  = candidate.getDay();
  // If weekend or before 21:00 UTC (4PM ET + buffer), start from yesterday
  if (day === 0 || day === 6 || hour < 21) {
    candidate = prevWeekday(candidate);
  }

  let attempts = 0;
  while (found.length < 2 && attempts < 10) {
    attempts++;
    const dateStr = toDateStr(candidate);
    try {
      const res = await massiveFetch(
        `/v2/aggs/grouped/locale/us/market/stocks/${dateStr}?adjusted=true&limit=1`,
        key
      );
      if (res.results && res.results.length > 0) {
        found.push(dateStr);
      }
    } catch {}
    candidate = prevWeekday(candidate);
  }

  // found[0] = most recent trading day (current bar)
  // found[1] = trading day before that (mother bar)
  return [found[0] || toDateStr(new Date()), found[1] || toDateStr(prevWeekday(new Date()))];
}

// ── Mock data (used when no key is set) ──────────────────────────────────────
function getMockSignals(nearLow, filterPat) {
  const stocks = [
    { ticker:"KHC",  sector:"Consumer Staples", pattern:"inside-bull",  price:22.52, motherHigh:23.10, motherLow:21.80, motherOpen:21.90, motherClose:23.05, high:22.80, low:22.15, open:22.10, close:22.52, low52:21.04, high52:31.15, pctFromLow:"6.94",  callStrike:"23.50", putStrike:"21.50", confidence:88, daysOut:10, callPremium:"0.12" },
    { ticker:"WBA",  sector:"Healthcare",       pattern:"outside-bull", price:11.20, motherHigh:11.10, motherLow:10.80, motherOpen:10.90, motherClose:10.95, high:11.45, low:10.40, open:10.60, close:11.20, low52:10.80, high52:21.40, pctFromLow:"3.70",  callStrike:"11.50", putStrike:"10.50", confidence:82, daysOut:7,  callPremium:"0.18" },
    { ticker:"INTC", sector:"Technology",       pattern:"inside-bear",  price:21.50, motherHigh:22.40, motherLow:21.00, motherOpen:22.30, motherClose:21.20, high:21.95, low:21.30, open:21.80, close:21.50, low52:20.90, high52:45.20, pctFromLow:"2.87",  callStrike:"22.50", putStrike:"21.00", confidence:79, daysOut:14, callPremium:"0.22" },
    { ticker:"PFE",  sector:"Healthcare",       pattern:"outside-bear", price:24.80, motherHigh:25.20, motherLow:24.90, motherOpen:25.00, motherClose:25.10, high:25.60, low:24.50, open:25.40, close:24.80, low52:23.80, high52:31.50, pctFromLow:"4.20",  callStrike:"25.50", putStrike:"24.50", confidence:74, daysOut:10, callPremium:"0.15" },
    { ticker:"MO",   sector:"Consumer Staples", pattern:"inside-bull",  price:44.80, motherHigh:45.80, motherLow:43.60, motherOpen:43.70, motherClose:45.60, high:45.10, low:44.10, open:44.20, close:44.80, low52:43.50, high52:56.30, pctFromLow:"2.99",  callStrike:"46.00", putStrike:"43.50", confidence:85, daysOut:7,  callPremium:"0.35" },
    { ticker:"T",    sector:"Telecom",          pattern:"inside-bull",  price:22.10, motherHigh:22.60, motherLow:21.40, motherOpen:21.50, motherClose:22.50, high:22.35, low:21.85, open:21.90, close:22.10, low52:21.40, high52:24.80, pctFromLow:"3.27",  callStrike:"23.00", putStrike:"21.00", confidence:76, daysOut:14, callPremium:"0.14" },
    { ticker:"F",    sector:"Consumer Disc",    pattern:"outside-bull", price:10.80, motherHigh:10.60, motherLow:10.30, motherOpen:10.40, motherClose:10.50, high:11.05, low:10.10, open:10.20, close:10.80, low52:10.50, high52:14.60, pctFromLow:"2.86",  callStrike:"11.00", putStrike:"10.00", confidence:71, daysOut:7,  callPremium:"0.09" },
    { ticker:"MPW",  sector:"Real Estate",      pattern:"inside-bear",  price:4.80,  motherHigh:5.10,  motherLow:4.65,  motherOpen:5.05,  motherClose:4.70,  high:4.98,  low:4.72,  open:4.95,  close:4.80,  low52:4.60,  high52:8.40,  pctFromLow:"4.35",  callStrike:"5.00",  putStrike:"4.50",  confidence:68, daysOut:10, callPremium:"0.07" },
    { ticker:"AAL",  sector:"Industrials",      pattern:"outside-bear", price:11.80, motherHigh:12.20, motherLow:11.90, motherOpen:12.10, motherClose:12.00, high:12.55, low:11.60, open:12.40, close:11.80, low52:11.30, high52:17.20, pctFromLow:"4.42",  callStrike:"12.50", putStrike:"11.50", confidence:66, daysOut:7,  callPremium:"0.11" },
    { ticker:"PARA", sector:"Comm Services",    pattern:"inside-bull",  price:11.20, motherHigh:11.60, motherLow:10.80, motherOpen:10.85, motherClose:11.50, high:11.35, low:10.95, open:11.00, close:11.20, low52:10.90, high52:16.80, pctFromLow:"2.75",  callStrike:"12.00", putStrike:"10.50", confidence:72, daysOut:14, callPremium:"0.13" },
  ];

  return stocks
    .filter(s => {
      const pct = parseFloat(s.pctFromLow);
      if (pct > nearLow) return false;
      if (filterPat === "all") return true;
      if (filterPat === "inside")  return s.pattern.startsWith("inside");
      if (filterPat === "outside") return s.pattern.startsWith("outside");
      return s.pattern === filterPat;
    })
    .map(s => ({ ...s, volume: 12000000, name: s.ticker }))
    .sort((a, b) => b.confidence - a.confidence);
}

function genMock5m(price) {
  const bars = []; let p = price * 0.992;
  for (let i = 0; i < 78; i++) {
    const o = p, c = o + (Math.random() - 0.47) * (price * 0.003);
    const h = Math.max(o,c) + Math.random() * price * 0.001;
    const l = Math.min(o,c) - Math.random() * price * 0.001;
    bars.push({ o:+o.toFixed(2), h:+h.toFixed(2), l:+l.toFixed(2), c:+c.toFixed(2), v: 80000 });
    p = c;
  }
  return bars;
}

function genMockOptions(ticker, direction) {
  const base = 22 + (ticker.charCodeAt(0) % 10);
  return [7,10,14,21,30].map((days, i) => ({
    strike:        +(base + (direction==="call" ? i*0.5 : -i*0.5)).toFixed(2),
    expiry:        toDateStr(new Date(Date.now() + days*86400000)),
    contractType:  direction,
    daysToExpiry:  days,
    premium:       +(0.08 + i*0.04).toFixed(2)
  }));
}

// ── Response helpers ──────────────────────────────────────────────────────────
function ok(data)          { return new Response(JSON.stringify(data), { headers: CORS }); }
function err(msg, status)  { return new Response(JSON.stringify({ error: msg }), { status, headers: CORS }); }
