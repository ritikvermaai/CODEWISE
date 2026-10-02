import mongoose from "mongoose";

const startedAt = new Date();

function envStatus() {
  const required = [
    "MONGO_URI",
    "JWT_SECRET",
    "DATA_ENCRYPTION_KEY",
    "GEMINI_API_KEY",
    "EMAILJS_SERVICE_ID",
    "EMAILJS_PUBLIC_KEY",
    "EMAILJS_OTP_TEMPLATE_ID",
    "EMAILJS_RESET_TEMPLATE_ID"
  ];
  const missing = required.filter(key => !process.env[key]);
  return {
    status: missing.length ? "warning" : "ok",
    configured: required.length - missing.length,
    total: required.length,
    missing
  };
}

async function mongoCheck() {
  const started = Date.now();
  try {
    if (mongoose.connection.readyState !== 1) {
      return { status: "error", message: "MongoDB is not connected.", latencyMs: Date.now() - started };
    }
    await mongoose.connection.db.command({ ping: 1 });
    return {
      status: "ok",
      state: "connected",
      database: mongoose.connection.name || "unknown",
      latencyMs: Date.now() - started
    };
  } catch (error) {
    return { status: "error", message: error.message || "MongoDB ping failed.", latencyMs: Date.now() - started };
  }
}

async function geminiCheck() {
  const started = Date.now();
  if (!process.env.GEMINI_API_KEY) {
    return { status: "error", message: "GEMINI_API_KEY is not configured.", latencyMs: Date.now() - started };
  }

  try {
    // Model listing verifies the API key without generating content or consuming model output tokens.
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}&pageSize=1`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const body = await response.text();
    if (!response.ok) {
      return {
        status: "error",
        message: `Gemini API returned HTTP ${response.status}.`,
        latencyMs: Date.now() - started
      };
    }
    return {
      status: "ok",
      message: "Gemini API reachable and key accepted.",
      latencyMs: Date.now() - started
    };
  } catch (error) {
    return {
      status: "error",
      message: error.message || "Could not reach Gemini API.",
      latencyMs: Date.now() - started
    };
  }
}

function emailjsCheck() {
  const required = [
    "EMAILJS_SERVICE_ID",
    "EMAILJS_PUBLIC_KEY",
    "EMAILJS_OTP_TEMPLATE_ID",
    "EMAILJS_RESET_TEMPLATE_ID"
  ];
  const missing = required.filter(key => !process.env[key]);
  return {
    status: missing.length ? "warning" : "ok",
    message: missing.length ? "EmailJS is not fully configured." : "EmailJS credentials and templates are configured. Sending is not tested to avoid sending an email.",
    missing
  };
}

export async function getHealth() {
  const checks = {
    backend: {
      status: "ok",
      message: "Express API process is running.",
      uptimeSeconds: Math.floor(process.uptime())
    },
    mongodb: await mongoCheck(),
    gemini: await geminiCheck(),
    emailjs: emailjsCheck(),
    environment: envStatus()
  };

  const hasError = Object.values(checks).some(check => check.status === "error");
  const hasWarning = Object.values(checks).some(check => check.status === "warning");
  const status = hasError ? "unhealthy" : hasWarning ? "degraded" : "healthy";

  return {
    status,
    service: "CodeWise API",
    version: process.env.npm_package_version || "unknown",
    environment: process.env.NODE_ENV || "production",
    serverTime: new Date().toISOString(),
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    memory: {
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    checks
  };
}

const esc = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const statusClass = status => status === "ok" ? "ok" : status === "warning" ? "warn" : "bad";
const statusLabel = status => status === "ok" ? "Operational" : status === "warning" ? "Configured / Limited" : "Issue";

function formatUptime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return [d ? `${d}d` : "", h ? `${h}h` : "", m ? `${m}m` : "", `${sec}s`].filter(Boolean).join(" ");
}

export function renderHealthPage(data) {
  const checkCards = Object.entries(data.checks).map(([key, check]) => `
    <article class="card">
      <div class="card-top">
        <div class="icon ${statusClass(check.status)}">${key === "backend" ? "⚙" : key === "mongodb" ? "◈" : key === "gemini" ? "✦" : key === "emailjs" ? "✉" : "◆"}</div>
        <div>
          <h2>${esc(key === "mongodb" ? "MongoDB" : key === "emailjs" ? "EmailJS" : key === "gemini" ? "Gemini API" : key === "backend" ? "Backend" : "Environment")}</h2>
          <span class="pill ${statusClass(check.status)}"><i></i>${esc(statusLabel(check.status))}</span>
        </div>
      </div>
      <p>${esc(check.message || "")}</p>
      ${check.latencyMs !== undefined ? `<div class="metric"><span>Latency</span><strong>${esc(check.latencyMs)} ms</strong></div>` : ""}
      ${check.database ? `<div class="metric"><span>Database</span><strong>${esc(check.database)}</strong></div>` : ""}
      ${check.uptimeSeconds !== undefined ? `<div class="metric"><span>Uptime</span><strong>${esc(formatUptime(check.uptimeSeconds))}</strong></div>` : ""}
      ${check.missing?.length ? `<div class="missing">Missing: ${esc(check.missing.join(", "))}</div>` : ""}
    </article>
  `).join("");

  const overallClass = statusClass(data.status === "healthy" ? "ok" : data.status === "degraded" ? "warning" : "error");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="30">
<title>CodeWise Backend Health</title>
<style>
:root{color-scheme:dark;--bg:#070a12;--panel:#0e1422;--panel2:#111a2b;--text:#eef4ff;--muted:#8e9bb1;--line:#1e293b;--accent:#7c9cff}
*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at 20% 0%,#15264d 0,#070a12 42%);color:var(--text);min-height:100vh}.wrap{width:min(1100px,calc(100% - 32px));margin:0 auto;padding:42px 0 60px}.hero{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:28px}.brand{display:flex;gap:14px;align-items:center}.logo{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(135deg,#6f8cff,#8d5cff);font-size:24px;box-shadow:0 12px 40px #516eea44}.eyebrow{font-size:12px;letter-spacing:.14em;color:#91a5c8;text-transform:uppercase}.title{font-size:34px;margin:4px 0 4px}.sub{margin:0;color:var(--muted)}.overall{padding:12px 16px;border:1px solid var(--line);background:#0c1320cc;border-radius:16px}.overall b{display:block;font-size:17px}.overall small{color:var(--muted)}.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px;background:#45d483}.dot.warn{background:#f2bd58}.dot.bad{background:#ff6f7d}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.card{background:linear-gradient(180deg,#111a2aee,#0c1220ee);border:1px solid var(--line);border-radius:20px;padding:22px;box-shadow:0 20px 50px #00000022}.card-top{display:flex;gap:13px;align-items:center}.card h2{margin:0 0 7px;font-size:18px}.icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;font-size:20px;background:#172239;color:#a9bbff}.icon.ok{background:#0f2b20;color:#58e59a}.icon.warn{background:#30260f;color:#f2bd58}.icon.bad{background:#35151b;color:#ff7c87}.pill{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#9eabc0}.pill i{width:7px;height:7px;border-radius:50%;background:#58e59a}.pill.warn i{background:#f2bd58}.pill.bad i{background:#ff7c87}.card p{color:#aab6ca;line-height:1.55;min-height:44px}.metric{display:flex;justify-content:space-between;border-top:1px solid #1b2638;padding:10px 0 0;margin-top:10px;color:#8290a7;font-size:12px}.metric strong{color:#e8effc}.missing{margin-top:12px;padding:10px;border-radius:10px;background:#28171b;color:#ff9da5;font-size:12px;word-break:break-word}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.mini{border:1px solid var(--line);background:#0d1422;border-radius:14px;padding:14px}.mini span{display:block;color:#738199;font-size:11px;margin-bottom:5px}.mini b{font-size:14px}.routes{margin-top:16px}.routes h2{font-size:18px}.route{display:flex;justify-content:space-between;gap:16px;padding:11px 13px;border-top:1px solid var(--line);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}.route span:last-child{color:#58e59a}.footer{margin-top:22px;color:#65738b;font-size:12px;text-align:center}@media(max-width:760px){.hero{display:block}.overall{margin-top:18px}.grid{grid-template-columns:1fr}.meta{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<main class="wrap">
<header class="hero">
  <div class="brand"><div class="logo">🧠</div><div><div class="eyebrow">CodeWise infrastructure</div><h1 class="title">Backend Health</h1><p class="sub">Live service and dependency diagnostics</p></div></div>
  <div class="overall"><b><span class="dot ${overallClass === "warn" ? "warn" : overallClass === "bad" ? "bad" : ""}"></span>${esc(data.status.toUpperCase())}</b><small>Refreshes every 30 seconds</small></div>
</header>
<section class="meta">
  <div class="mini"><span>Service</span><b>${esc(data.service)}</b></div>
  <div class="mini"><span>Environment</span><b>${esc(data.environment)}</b></div>
  <div class="mini"><span>Node</span><b>${esc(data.node)}</b></div>
  <div class="mini"><span>Uptime</span><b>${esc(formatUptime(data.uptimeSeconds))}</b></div>
</section>
<section class="grid">${checkCards}</section>
<section class="card routes">
<h2>API surface</h2>
${[
["GET /kaisahai","Health dashboard"],
["GET /kaisahai.json","Machine-readable health"],
["GET /api/health","Basic API health"],
["POST /api/auth/*","Authentication"],
["GET/POST /api/chats*","Chat operations"],
["POST /api/voice/transcribe","Voice transcription"],
["GET/PATCH/DELETE /api/account","Account operations"]
].map(([route,label])=>`<div class="route"><span>${esc(route)} · ${esc(label)}</span><span>Registered</span></div>`).join("")}
</section>
<p class="footer">Server time: ${esc(data.serverTime)} · This page never exposes secrets or user data.</p>
</main>
</body>
</html>`;
}
