import { useState, useEffect, useRef } from "react";

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0a;
    --surface: #111111;
    --surface2: #1a1a1a;
    --border: rgba(255,255,255,0.07);
    --border2: rgba(255,255,255,0.13);
    --green: #00ff88;
    --red: #ff4466;
    --amber: #ffaa00;
    --blue: #4488ff;
    --muted: #555;
    --text: #e8e8e8;
    --text2: #888;
    --mono: 'IBM Plex Mono', monospace;
    --sans: 'IBM Plex Sans', sans-serif;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--sans); }

  .app {
    min-height: 100vh;
    background: var(--bg);
    padding: 0;
  }

  .header {
    border-bottom: 1px solid var(--border);
    padding: 18px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    background: rgba(10,10,10,0.95);
    backdrop-filter: blur(12px);
    z-index: 100;
  }

  .logo {
    font-family: var(--mono);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.15em;
    color: var(--green);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--green);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .status-pill {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.1em;
    padding: 4px 10px;
    border-radius: 2px;
    border: 1px solid;
  }

  .status-pill.idle { border-color: var(--muted); color: var(--muted); }
  .status-pill.running { border-color: var(--green); color: var(--green); animation: borderPulse 1.5s infinite; }
  .status-pill.done { border-color: var(--blue); color: var(--blue); }

  @keyframes borderPulse {
    0%, 100% { border-color: var(--green); }
    50% { border-color: rgba(0,255,136,0.3); }
  }

  .main { padding: 28px; max-width: 1400px; margin: 0 auto; }

  .top-bar {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr auto;
    gap: 12px;
    margin-bottom: 24px;
    align-items: end;
  }

  .field { display: flex; flex-direction: column; gap: 6px; }

  .field label {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.12em;
    color: var(--text2);
    text-transform: uppercase;
  }

  .field select, .field input {
    background: var(--surface);
    border: 1px solid var(--border2);
    color: var(--text);
    font-family: var(--mono);
    font-size: 12px;
    padding: 9px 12px;
    border-radius: 3px;
    outline: none;
    appearance: none;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .field select:focus, .field input:focus {
    border-color: var(--green);
  }

  .scan-btn {
    background: var(--green);
    color: #000;
    border: none;
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1em;
    padding: 10px 24px;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .scan-btn:hover { background: #00cc6e; }
  .scan-btn:disabled { background: var(--muted); color: #333; cursor: not-allowed; }

  .metrics-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    margin-bottom: 24px;
  }

  .metric-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 14px 16px;
  }

  .metric-label {
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: 0.12em;
    color: var(--text2);
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .metric-val {
    font-family: var(--mono);
    font-size: 22px;
    font-weight: 500;
    color: var(--text);
  }

  .metric-val.green { color: var(--green); }
  .metric-val.red { color: var(--red); }
  .metric-val.amber { color: var(--amber); }
  .metric-val.blue { color: var(--blue); }

  .panels {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 16px;
  }

  .results-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    overflow: hidden;
  }

  .panel-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .panel-title {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.15em;
    color: var(--text2);
    text-transform: uppercase;
  }

  .results-table { width: 100%; border-collapse: collapse; }

  .results-table th {
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: 0.12em;
    color: var(--muted);
    text-transform: uppercase;
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    position: sticky;
    top: 0;
  }

  .results-table td {
    padding: 11px 14px;
    font-family: var(--mono);
    font-size: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    vertical-align: middle;
  }

  .results-table tr:hover td { background: rgba(255,255,255,0.02); }
  .results-table tr.selected td { background: rgba(0,255,136,0.04); }

  .ticker-cell {
    font-weight: 600;
    font-size: 13px;
    color: var(--text);
    cursor: pointer;
  }

  .ticker-cell:hover { color: var(--green); }

  .pattern-badge {
    display: inline-block;
    font-size: 9px;
    letter-spacing: 0.1em;
    padding: 3px 7px;
    border-radius: 2px;
    border: 1px solid;
    text-transform: uppercase;
    font-weight: 500;
  }

  .badge-inside-bull { border-color: rgba(0,255,136,0.4); color: var(--green); background: rgba(0,255,136,0.07); }
  .badge-inside-bear { border-color: rgba(255,68,102,0.4); color: var(--red); background: rgba(255,68,102,0.07); }
  .badge-outside-bull { border-color: rgba(68,136,255,0.5); color: var(--blue); background: rgba(68,136,255,0.08); }
  .badge-outside-bear { border-color: rgba(255,170,0,0.4); color: var(--amber); background: rgba(255,170,0,0.07); }

  .conf-bar {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .conf-track {
    width: 60px;
    height: 3px;
    background: var(--border2);
    border-radius: 2px;
    overflow: hidden;
  }

  .conf-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s;
  }

  .conf-num {
    font-size: 11px;
    color: var(--text2);
    min-width: 28px;
  }

  .call-info {
    color: var(--green);
    font-size: 11px;
  }

  .call-info span { color: var(--text2); font-size: 10px; margin-right: 4px; }

  .right-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .analysis-box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .analysis-content {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    min-height: 300px;
    max-height: 500px;
  }

  .analysis-content p {
    font-size: 13px;
    color: var(--text2);
    line-height: 1.7;
    margin-bottom: 10px;
  }

  .analysis-content p:last-child { margin-bottom: 0; }

  .analysis-content .highlight {
    color: var(--green);
    font-family: var(--mono);
    font-size: 12px;
  }

  .analysis-content .warn { color: var(--amber); }
  .analysis-content .danger { color: var(--red); }

  .analysis-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 200px;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-align: center;
    gap: 10px;
  }

  .cursor-blink {
    display: inline-block;
    width: 8px; height: 14px;
    background: var(--green);
    animation: blink 1s infinite;
    vertical-align: middle;
  }

  @keyframes blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }

  .log-box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    overflow: hidden;
  }

  .log-content {
    padding: 12px 14px;
    font-family: var(--mono);
    font-size: 10px;
    color: var(--text2);
    line-height: 1.8;
    max-height: 160px;
    overflow-y: auto;
  }

  .log-line { display: flex; gap: 8px; }
  .log-time { color: var(--muted); min-width: 55px; }
  .log-msg.green { color: var(--green); }
  .log-msg.amber { color: var(--amber); }
  .log-msg.red { color: var(--red); }
  .log-msg.blue { color: var(--blue); }
  .log-msg { color: var(--text2); }

  .empty-state {
    padding: 48px 24px;
    text-align: center;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.1em;
    line-height: 2;
  }

  .loading-row td {
    padding: 8px 14px;
    font-family: var(--mono);
    font-size: 11px;
  }

  .shimmer {
    background: linear-gradient(90deg, var(--surface2) 25%, rgba(255,255,255,0.05) 50%, var(--surface2) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    height: 12px;
    border-radius: 2px;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .scrollable-table {
    max-height: 520px;
    overflow-y: auto;
  }

  .filter-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .filter-chip {
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    padding: 4px 10px;
    border-radius: 2px;
    border: 1px solid var(--border2);
    color: var(--text2);
    cursor: pointer;
    transition: all 0.12s;
    background: transparent;
    text-transform: uppercase;
  }

  .filter-chip:hover { border-color: var(--text2); color: var(--text); }
  .filter-chip.active { border-color: var(--green); color: var(--green); background: rgba(0,255,136,0.06); }

  .sector-badge {
    font-size: 9px;
    color: var(--text2);
    letter-spacing: 0.05em;
  }

  .near-low-tag {
    font-size: 9px;
    color: var(--amber);
    font-family: var(--mono);
  }
`;

// Simulated market universe — in production this would be a real screener API
const UNIVERSE = [
  { ticker: "KHC", name: "Kraft Heinz", sector: "Consumer Staples", price: 22.52, low52: 21.04, high52: 31.15 },
  { ticker: "MO", name: "Altria Group", sector: "Consumer Staples", price: 44.80, low52: 39.20, high52: 56.30 },
  { ticker: "WBA", name: "Walgreens Boots", sector: "Healthcare", price: 11.20, low52: 8.80, high52: 21.40 },
  { ticker: "CVS", name: "CVS Health", sector: "Healthcare", price: 58.40, low52: 51.20, high52: 83.50 },
  { ticker: "T", name: "AT&T", sector: "Telecom", price: 22.10, low52: 17.50, high52: 24.80 },
  { ticker: "VZ", name: "Verizon", sector: "Telecom", price: 41.20, low52: 38.90, high52: 47.20 },
  { ticker: "F", name: "Ford Motor", sector: "Consumer Disc", price: 10.80, low52: 9.40, high52: 14.60 },
  { ticker: "INTC", name: "Intel", sector: "Technology", price: 21.50, low52: 18.40, high52: 45.20 },
  { ticker: "PFE", name: "Pfizer", sector: "Healthcare", price: 24.80, low52: 22.10, high52: 31.50 },
  { ticker: "BAC", name: "Bank of America", sector: "Financials", price: 38.20, low52: 35.80, high52: 47.30 },
  { ticker: "C", name: "Citigroup", sector: "Financials", price: 62.40, low52: 58.20, high52: 81.40 },
  { ticker: "GM", name: "General Motors", sector: "Consumer Disc", price: 48.60, low52: 43.20, high52: 61.80 },
  { ticker: "LVS", name: "Las Vegas Sands", sector: "Consumer Disc", price: 41.20, low52: 38.80, high52: 55.60 },
  { ticker: "NKE", name: "Nike", sector: "Consumer Disc", price: 72.40, low52: 68.90, high52: 96.20 },
  { ticker: "MPW", name: "Medical Properties", sector: "Real Estate", price: 4.80, low52: 4.20, high52: 8.40 },
  { ticker: "PARA", name: "Paramount Global", sector: "Comm Services", price: 11.20, low52: 8.90, high52: 16.80 },
  { ticker: "DIS", name: "Walt Disney", sector: "Comm Services", price: 96.40, low52: 88.30, high52: 123.70 },
  { ticker: "XOM", name: "Exxon Mobil", sector: "Energy", price: 108.20, low52: 102.40, high52: 126.30 },
  { ticker: "AAL", name: "American Airlines", sector: "Industrials", price: 11.80, low52: 9.60, high52: 17.20 },
  { ticker: "UAL", name: "United Airlines", sector: "Industrials", price: 72.40, low52: 62.10, high52: 102.30 },
];

function pctFromLow(price, low) {
  return ((price - low) / low * 100).toFixed(1);
}

function generateMockBars(ticker, price) {
  const seed = ticker.charCodeAt(0) + ticker.charCodeAt(ticker.length - 1);
  const rng = (min, max) => min + ((seed * 9301 + 49297) % 233280) / 233280 * (max - min);

  const patterns = ["inside-bull", "inside-bear", "outside-bull", "outside-bear"];
  const pattern = patterns[seed % 4];

  const motherHigh = price * (1 + rng(0.015, 0.035));
  const motherLow = price * (1 - rng(0.015, 0.035));
  const motherRange = motherHigh - motherLow;

  let insideHigh, insideLow;
  if (pattern.startsWith("inside")) {
    insideHigh = motherLow + motherRange * rng(0.55, 0.85);
    insideLow = motherLow + motherRange * rng(0.15, 0.45);
  } else {
    insideHigh = motherHigh * (1 + rng(0.005, 0.015));
    insideLow = motherLow * (1 - rng(0.005, 0.015));
  }

  const confidence = Math.min(95, Math.max(55, Math.round(60 + (seed % 35))));

  const callStrike = (Math.ceil(motherHigh / 0.5) * 0.5).toFixed(1);
  const callPremium = (rng(0.08, 0.25)).toFixed(2);
  const daysOut = [7, 10, 14][seed % 3];

  return { pattern, motherHigh, motherLow, insideHigh, insideLow, confidence, callStrike, callPremium, daysOut };
}

function confColor(n) {
  if (n >= 80) return "#00ff88";
  if (n >= 65) return "#ffaa00";
  return "#ff4466";
}

export default function BarScanner() {
  const [results, setResults] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [filterPattern, setFilterPattern] = useState("all");
  const [nearLowPct, setNearLowPct] = useState(5);
  const [scanComplete, setScanComplete] = useState(false);
  const analysisRef = useRef("");
  const logsEndRef = useRef(null);

  function addLog(msg, type = "") {
    const now = new Date();
    const time = now.toTimeString().slice(0, 8);
    setLogs(prev => [...prev.slice(-40), { time, msg, type }]);
  }

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  async function runScan() {
    setScanning(true);
    setScanComplete(false);
    setResults([]);
    setSelected(null);
    setAnalysis("");
    setLogs([]);

    addLog("Initializing market scan...", "green");
    await delay(400);
    addLog(`Universe: ${UNIVERSE.length} symbols loaded`, "blue");
    await delay(300);
    addLog("Checking weekly OHLC data...", "");
    await delay(500);

    const found = [];
    for (let i = 0; i < UNIVERSE.length; i++) {
      const stock = UNIVERSE[i];
      const pct = parseFloat(pctFromLow(stock.price, stock.low52));

      await delay(80);

      if (pct <= nearLowPct) {
        const bars = generateMockBars(stock.ticker, stock.price);
        addLog(`${stock.ticker} — ${pct}% from 52w low → ${bars.pattern} detected`, "amber");
        found.push({ ...stock, ...bars, pct });
      } else if (i % 4 === 0) {
        addLog(`${stock.ticker} — ${pct}% from low, skipped`, "");
      }
    }

    await delay(300);
    addLog(`Scan complete. ${found.length} signals found.`, "green");
    setResults(found);
    setScanning(false);
    setScanComplete(true);
  }

  async function analyzeSignal(signal) {
    setSelected(signal);
    setAnalysis("");
    setAnalysisLoading(true);
    analysisRef.current = "";

    const prompt = `You are an elite options trader specializing in inside bar and outside bar setups.

Analyze this trade signal concisely:

Stock: ${signal.ticker} (${signal.name}) — ${signal.sector}
Current Price: $${signal.price}
Pattern: ${signal.pattern} on weekly timeframe
52-week low: $${signal.low52} | Distance from low: ${signal.pct}%
Mother bar range: $${signal.motherLow.toFixed(2)} – $${signal.motherHigh.toFixed(2)}
${signal.pattern.startsWith("inside") ? `Inside bar range: $${signal.insideLow.toFixed(2)} – $${signal.insideHigh.toFixed(2)}` : `Outside bar fully engulfs prior range`}
Suggested call: $${signal.callStrike} strike, ${signal.daysOut} days out, premium $${signal.callPremium}
Confidence score: ${signal.confidence}/100

Provide:
1. Why this specific setup is high (or low) quality right now
2. The exact entry trigger and what to watch for
3. Stop loss placement
4. Risk/reward assessment for the $${signal.callPremium} call
5. One key risk to watch

Be direct, specific, and concise. No fluff. Use precise price levels.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          stream: true,
          messages: [{ role: "user", content: prompt }]
        })
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "content_block_delta" && data.delta?.text) {
                analysisRef.current += data.delta.text;
                setAnalysis(analysisRef.current);
              }
            } catch {}
          }
        }
      }
    } catch (e) {
      setAnalysis("⚠ Unable to reach analysis engine. Check API connectivity.");
    }
    setAnalysisLoading(false);
  }

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  const filtered = results.filter(r =>
    filterPattern === "all" ? true : r.pattern === filterPattern
  );

  const counts = {
    total: results.length,
    insideBull: results.filter(r => r.pattern === "inside-bull").length,
    insideBear: results.filter(r => r.pattern === "inside-bear").length,
    outsideBull: results.filter(r => r.pattern === "outside-bull").length,
    outsideBear: results.filter(r => r.pattern === "outside-bear").length,
  };

  const patternLabel = {
    "inside-bull": "Inside Bull",
    "inside-bear": "Inside Bear",
    "outside-bull": "Outside Bull",
    "outside-bear": "Outside Bear",
  };

  const patternClass = {
    "inside-bull": "badge-inside-bull",
    "inside-bear": "badge-inside-bear",
    "outside-bull": "badge-outside-bull",
    "outside-bear": "badge-outside-bear",
  };

  function formatAnalysis(text) {
    return text.split("\n").map((line, i) => {
      if (!line.trim()) return null;
      return <p key={i} dangerouslySetInnerHTML={{
        __html: line
          .replace(/\*\*(.*?)\*\*/g, '<span class="highlight">$1</span>')
          .replace(/\$([\d.]+)/g, '<span class="highlight">$$$1</span>')
      }} />;
    }).filter(Boolean);
  }

  return (
    <>
      <style>{STYLE}</style>
      <div className="app">
        <div className="header">
          <div className="logo">
            <div className="logo-dot" />
            BAR_SCANNER // v2.4
          </div>
          <div className="header-right">
            <span className={`status-pill ${scanning ? "running" : scanComplete ? "done" : "idle"}`}>
              {scanning ? "SCANNING" : scanComplete ? `${results.length} SIGNALS` : "IDLE"}
            </span>
          </div>
        </div>

        <div className="main">
          <div className="top-bar">
            <div className="field">
              <label>Near 52-week low (%)</label>
              <select value={nearLowPct} onChange={e => setNearLowPct(Number(e.target.value))}>
                <option value={3}>Within 3%</option>
                <option value={5}>Within 5%</option>
                <option value={8}>Within 8%</option>
                <option value={10}>Within 10%</option>
                <option value={100}>All (no filter)</option>
              </select>
            </div>
            <div className="field">
              <label>Timeframe</label>
              <select defaultValue="weekly">
                <option value="weekly">Weekly (recommended)</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <div className="field">
              <label>Pattern type</label>
              <select value={filterPattern} onChange={e => setFilterPattern(e.target.value)}>
                <option value="all">All patterns</option>
                <option value="inside-bull">Inside Bar — Bullish</option>
                <option value="inside-bear">Inside Bar — Bearish</option>
                <option value="outside-bull">Outside Bar — Bullish</option>
                <option value="outside-bear">Outside Bar — Bearish</option>
              </select>
            </div>
            <button className="scan-btn" onClick={runScan} disabled={scanning}>
              {scanning ? "SCANNING..." : "▶ RUN SCAN"}
            </button>
          </div>

          <div className="metrics-row">
            <div className="metric-card">
              <div className="metric-label">Total signals</div>
              <div className={`metric-val ${counts.total > 0 ? "green" : ""}`}>{counts.total}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Inside bull</div>
              <div className="metric-val green">{counts.insideBull}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Inside bear</div>
              <div className="metric-val red">{counts.insideBear}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Outside bull</div>
              <div className="metric-val blue">{counts.outsideBull}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Outside bear</div>
              <div className="metric-val amber">{counts.outsideBear}</div>
            </div>
          </div>

          <div className="panels">
            <div className="results-panel">
              <div className="panel-header">
                <span className="panel-title">Scan results — click row for AI analysis</span>
                <div className="filter-row">
                  {["all","inside-bull","inside-bear","outside-bull","outside-bear"].map(f => (
                    <button key={f} className={`filter-chip ${filterPattern === f ? "active" : ""}`}
                      onClick={() => setFilterPattern(f)}>
                      {f === "all" ? "ALL" : patternLabel[f]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="scrollable-table">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th>Pattern</th>
                      <th>Price</th>
                      <th>% from low</th>
                      <th>Confidence</th>
                      <th>Call target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanning && results.length === 0 && (
                      [1,2,3].map(i => (
                        <tr key={i} className="loading-row">
                          {[1,2,3,4,5,6].map(j => (
                            <td key={j}><div className="shimmer" style={{width: `${40+j*8}px`}} /></td>
                          ))}
                        </tr>
                      ))
                    )}
                    {!scanning && filtered.length === 0 && (
                      <tr><td colSpan={6}>
                        <div className="empty-state">
                          {scanComplete ? "NO SIGNALS MATCH CURRENT FILTERS" : "PRESS ▶ RUN SCAN TO BEGIN"}
                        </div>
                      </td></tr>
                    )}
                    {filtered.map(r => (
                      <tr key={r.ticker}
                        className={selected?.ticker === r.ticker ? "selected" : ""}
                        onClick={() => analyzeSignal(r)}
                        style={{cursor:"pointer"}}>
                        <td>
                          <div className="ticker-cell">{r.ticker}</div>
                          <div className="sector-badge">{r.sector}</div>
                        </td>
                        <td><span className={`pattern-badge ${patternClass[r.pattern]}`}>{patternLabel[r.pattern]}</span></td>
                        <td style={{fontFamily:"var(--mono)",fontSize:"12px"}}>${r.price.toFixed(2)}</td>
                        <td>
                          <span className="near-low-tag">+{r.pct}%</span>
                        </td>
                        <td>
                          <div className="conf-bar">
                            <div className="conf-track">
                              <div className="conf-fill" style={{width:`${r.confidence}%`, background: confColor(r.confidence)}} />
                            </div>
                            <span className="conf-num" style={{color: confColor(r.confidence)}}>{r.confidence}</span>
                          </div>
                        </td>
                        <td>
                          <div className="call-info">
                            <span>CALL</span>${r.callStrike} · ${r.callPremium}
                          </div>
                          <div style={{fontSize:"9px",color:"var(--muted)",fontFamily:"var(--mono)"}}>{r.daysOut}d exp</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="right-panel">
              <div className="analysis-box">
                <div className="panel-header">
                  <span className="panel-title">
                    {selected ? `AI ANALYSIS — ${selected.ticker}` : "AI ANALYSIS"}
                  </span>
                  {analysisLoading && <span className="cursor-blink" />}
                </div>
                <div className="analysis-content">
                  {!selected && !analysisLoading && (
                    <div className="analysis-placeholder">
                      <div>SELECT A SIGNAL</div>
                      <div style={{fontSize:"9px",color:"var(--muted)"}}>CLICK ANY ROW FOR ANALYSIS</div>
                    </div>
                  )}
                  {(analysis || analysisLoading) && (
                    <>
                      {formatAnalysis(analysis)}
                      {analysisLoading && <span className="cursor-blink" />}
                    </>
                  )}
                </div>
              </div>

              <div className="log-box">
                <div className="panel-header">
                  <span className="panel-title">SCAN LOG</span>
                </div>
                <div className="log-content">
                  {logs.length === 0 && (
                    <div style={{color:"var(--muted)"}}>— awaiting scan —</div>
                  )}
                  {logs.map((l, i) => (
                    <div key={i} className="log-line">
                      <span className="log-time">{l.time}</span>
                      <span className={`log-msg ${l.type}`}>{l.msg}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
