/* ============================================================
   DSA Tracker Dashboard
   Fetches /stats from the FastAPI backend and renders an
   interactive view. Falls back to demo data if offline so the
   page always looks alive.
   ============================================================ */

const API_BASE = "http://127.0.0.1:8000";
const STATS_URL = `${API_BASE}/stats`;
const REFRESH_MS = 30000;

const DIFF_COLORS = { Easy: "#35d07f", Medium: "#ff9f45", Hard: "#ff6b6b", Unknown: "#8a95ad" };
const PALETTE = ["#4fa8ff", "#a78bfa", "#35d07f", "#ff9f45", "#ff6b6b", "#f472b6", "#22d3ee", "#facc15"];

let charts = {};
let lastData = null;
let currentFilter = "all";

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);

function cssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

/* Animated count-up for KPI numbers */
function animateValue(el, to, dur = 900) {
  const from = Number(el.dataset.val || 0);
  if (from === to) { el.textContent = to; return; }
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic
    el.textContent = Math.round(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(step);
    else el.dataset.val = to;
  }
  requestAnimationFrame(step);
}

/* ---------- demo fallback ---------- */
function demoData() {
  const byDate = {};
  const today = new Date();
  for (let i = 0; i < 120; i++) {
    if (Math.random() > 0.55) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      byDate[d.toISOString().slice(0, 10)] = 1 + Math.floor(Math.random() * 4);
    }
  }
  return {
    total_tracked: 42, total_pushed: 31, total_failed: 11,
    active_days: Object.keys(byDate).length,
    current_streak: 4, longest_streak: 12,
    by_platform: { LeetCode: 18, GFG: 8, Codeforces: 3, CodeChef: 2 },
    by_category: { Arrays: 12, Strings: 6, Trees: 5, "Dynamic Programming": 4, Graphs: 3, Math: 1 },
    by_difficulty: { Easy: 14, Medium: 13, Hard: 4 },
    by_date: byDate,
    recent: [
      { title: "Two Sum", platform: "LeetCode", language: "cpp", difficulty: "Easy", category: "Arrays", status: "pushed", solved_date: "2026-07-19" },
      { title: "Number of Common Factors", platform: "LeetCode", language: "python", difficulty: "Easy", category: "Math", status: "pushed", solved_date: "2026-07-18" },
      { title: "Find Triangular Sum of an Array", platform: "LeetCode", language: "python", difficulty: "Medium", category: "Arrays", status: "failed" },
    ],
    _demo: true,
  };
}

/* ---------- data load ---------- */
async function loadStats() {
  const conn = $("conn");
  try {
    const res = await fetch(STATS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    conn.className = "pill ok";
    conn.innerHTML = '<span class="dot"></span> live';
    return data;
  } catch (e) {
    const data = demoData();
    conn.className = "pill off";
    conn.innerHTML = '<span class="dot"></span> demo data (backend offline)';
    return data;
  }
}

/* ---------- KPIs ---------- */
function renderKPIs(d) {
  animateValue($("kpi-pushed"), d.total_pushed || 0);
  animateValue($("kpi-streak"), d.current_streak || 0);
  animateValue($("kpi-longest"), d.longest_streak || 0);
  animateValue($("kpi-active"), d.active_days || 0);
  $("kpi-pushed-foot").textContent = `${d.total_tracked || 0} tracked · ${d.total_failed || 0} failed`;
  $("kpi-streak-foot").textContent = (d.current_streak > 0) ? "keep it going 🔥" : "solve one today";
  $("kpi-active-foot").textContent = "days you showed up";
}

/* ---------- Heatmap (last ~26 weeks) ---------- */
function renderHeatmap(byDate) {
  const map = byDate || {};
  const el = $("heatmap");
  el.innerHTML = "";
  const tip = $("heat-tip");

  const weeks = 26;
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  // align to Sunday
  start.setDate(start.getDate() - start.getDay());

  const max = Math.max(1, ...Object.values(map));
  const level = (n) => {
    if (!n) return 0;
    const r = n / max;
    if (r > 0.75) return 4;
    if (r > 0.5) return 3;
    if (r > 0.25) return 2;
    return 1;
  };

  const cursor = new Date(start);
  const end = new Date(today);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const count = map[key] || 0;
    const cell = document.createElement("div");
    const lv = level(count);
    cell.className = "cell" + (lv ? ` l${lv}` : "");
    const dateStr = cursor.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    cell.addEventListener("mouseenter", (ev) => {
      tip.textContent = `${count} solved · ${dateStr}`;
      tip.style.opacity = "1";
      tip.style.left = ev.clientX + 12 + "px";
      tip.style.top = ev.clientY + 12 + "px";
    });
    cell.addEventListener("mousemove", (ev) => {
      tip.style.left = ev.clientX + 12 + "px";
      tip.style.top = ev.clientY + 12 + "px";
    });
    cell.addEventListener("mouseleave", () => { tip.style.opacity = "0"; });
    el.appendChild(cell);
    cursor.setDate(cursor.getDate() + 1);
  }
}

/* ---------- Charts ---------- */
function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

function baseOpts(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: "easeOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#05070d",
        padding: 10,
        titleColor: "#fff",
        bodyColor: "#cdd6e6",
        borderColor: "rgba(255,255,255,0.12)",
        borderWidth: 1,
      },
    },
    ...extra,
  };
}

function renderDifficulty(byDiff) {
  const entries = Object.entries(byDiff || {}).filter(([, v]) => v > 0);
  destroyChart("diff");
  const labels = entries.map(([k]) => k);
  const values = entries.map(([, v]) => v);
  const colors = labels.map((l) => DIFF_COLORS[l] || "#8a95ad");

  charts.diff = new Chart($("chart-diff"), {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] },
    options: baseOpts({ cutout: "66%" }),
  });

  const total = values.reduce((a, b) => a + b, 0) || 1;
  $("diff-legend").innerHTML = entries.map(([k, v]) =>
    `<span class="ml-item"><i style="background:${DIFF_COLORS[k] || "#8a95ad"}"></i>${k} · ${v} (${Math.round(v / total * 100)}%)</span>`
  ).join("");
}

function renderPlatform(byPlatform) {
  const entries = Object.entries(byPlatform || {}).sort((a, b) => b[1] - a[1]);
  destroyChart("platform");
  charts.platform = new Chart($("chart-platform"), {
    type: "polarArea",
    data: {
      labels: entries.map(([k]) => k),
      datasets: [{ data: entries.map(([, v]) => v), backgroundColor: entries.map((_, i) => PALETTE[i % PALETTE.length] + "cc"), borderWidth: 0 }],
    },
    options: baseOpts({
      scales: { r: { grid: { color: "rgba(255,255,255,0.08)" }, ticks: { display: false }, angleLines: { color: "rgba(255,255,255,0.08)" } } },
      plugins: { legend: { display: true, position: "bottom", labels: { color: cssVar("--txt-dim"), font: { size: 11 }, boxWidth: 10 } } },
    }),
  });
}

function renderCategories(byCat) {
  const entries = Object.entries(byCat || {}).sort((a, b) => b[1] - a[1]).slice(0, 7);
  destroyChart("cat");
  charts.cat = new Chart($("chart-cat"), {
    type: "bar",
    data: {
      labels: entries.map(([k]) => k),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map((_, i) => PALETTE[i % PALETTE.length]),
        borderRadius: 6, barThickness: 16,
      }],
    },
    options: baseOpts({
      indexAxis: "y",
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.06)" }, ticks: { color: cssVar("--txt-dim"), precision: 0 } },
        y: { grid: { display: false }, ticks: { color: cssVar("--txt-dim"), font: { size: 11 } } },
      },
    }),
  });
}

/* ---------- Feed ---------- */
function renderFeed(recent) {
  const list = $("feed");
  const items = (recent || []).filter((it) => currentFilter === "all" || it.status === currentFilter);
  if (!items.length) {
    list.innerHTML = `<li class="feed-empty">Nothing here yet. Go solve a problem 🚀</li>`;
    return;
  }
  list.innerHTML = items.map((it) => {
    const status = it.status || "pending";
    const icon = status === "pushed" ? "✓" : status === "failed" ? "✕" : "…";
    const when = it.solved_date || (it.created_at ? it.created_at.slice(0, 10) : "");
    return `
      <li class="feed-item">
        <span class="feed-status ${status}">${icon}</span>
        <div class="feed-main">
          <div class="feed-title">${escapeHtml(it.title || "Untitled")}</div>
          <div class="feed-meta">
            <span>${escapeHtml(it.platform || "—")}</span>
            <span>· ${escapeHtml(it.language || "—")}</span>
            <span>· ${escapeHtml(it.difficulty || "—")}</span>
            <span>· ${escapeHtml(it.category || "—")}</span>
            ${when ? `<span>· ${when}</span>` : ""}
          </div>
        </div>
      </li>`;
  }).join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- orchestration ---------- */
async function refresh() {
  const data = await loadStats();
  lastData = data;
  renderKPIs(data);
  renderHeatmap(data.by_date);
  renderDifficulty(data.by_difficulty);
  renderPlatform(data.by_platform);
  renderCategories(data.by_category);
  renderFeed(data.recent);
}

/* ---------- events ---------- */
$("refresh").addEventListener("click", () => {
  const btn = $("refresh");
  btn.style.transform = "rotate(360deg)";
  setTimeout(() => (btn.style.transform = ""), 400);
  refresh();
});

$("theme").addEventListener("click", () => {
  const light = document.body.getAttribute("data-theme") === "light";
  document.body.setAttribute("data-theme", light ? "" : "light");
  localStorage.setItem("dsa-theme", light ? "dark" : "light");
  if (lastData) { // recolor charts for new theme
    renderDifficulty(lastData.by_difficulty);
    renderPlatform(lastData.by_platform);
    renderCategories(lastData.by_category);
  }
});

$("filters").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  currentFilter = btn.dataset.f;
  if (lastData) renderFeed(lastData.recent);
});

/* ---------- boot ---------- */
$("api-url").textContent = STATS_URL;
if (localStorage.getItem("dsa-theme") === "light") document.body.setAttribute("data-theme", "light");
refresh();
setInterval(refresh, REFRESH_MS);
