/* dashboard.js — in-extension dashboard, reads stats from the service worker */

const DIFF_COLORS = { Easy: "#35d07f", Medium: "#ff9f45", Hard: "#ff6b6b", Unknown: "#8a95ad" };
const PALETTE = ["#4fa8ff", "#a78bfa", "#35d07f", "#ff9f45", "#ff6b6b", "#f472b6", "#22d3ee", "#facc15"];

let charts = {};
let lastData = null;
let currentFilter = "all";

const $ = (id) => document.getElementById(id);
const cssVar = (n) => getComputedStyle(document.body).getPropertyValue(n).trim();

function animateValue(el, to, dur = 900) {
  const from = Number(el.dataset.val || 0);
  if (from === to) { el.textContent = to; el.dataset.val = to; return; }
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(step);
    else el.dataset.val = to;
  }
  requestAnimationFrame(step);
}

function getStats() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_STATS" }, (res) => {
      if (chrome.runtime.lastError || !res || !res.success) {
        resolve(null);
      } else {
        resolve(res.stats);
      }
    });
  });
}

function renderKPIs(d) {
  animateValue($("kpi-pushed"), d.total_pushed || 0);
  animateValue($("kpi-streak"), d.current_streak || 0);
  animateValue($("kpi-longest"), d.longest_streak || 0);
  animateValue($("kpi-active"), d.active_days || 0);
  $("kpi-pushed-foot").textContent = `${d.total_tracked || 0} tracked · ${d.total_failed || 0} failed`;
  $("kpi-streak-foot").textContent = (d.current_streak > 0) ? "keep it going 🔥" : "solve one today";
}

function renderHeatmap(byDate) {
  const map = byDate || {};
  const container = $("heatmap-months-container");
  if (!container) return;
  container.innerHTML = "";
  const tip = $("heat-tip");

  const today = new Date();
  const currentYear = today.getFullYear();

  // Always include January through the current month
  const monthList = [];
  const endMonth = Math.max(today.getMonth(), 6); // At least Jan to July
  for (let m = 0; m <= endMonth; m++) {
    monthList.push(new Date(currentYear, m, 1));
  }

  const max = Math.max(1, ...Object.values(map));
  const level = (n) => {
    if (!n) return 0;
    const r = n / max;
    if (r > 0.75) return 4;
    if (r > 0.5) return 3;
    if (r > 0.25) return 2;
    return 1;
  };

  monthList.forEach((monthStart) => {
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const monthName = monthStart.toLocaleString(undefined, { month: "short", year: "numeric" });
    const lastDay = new Date(year, month + 1, 0).getDate();

    const monthCard = document.createElement("div");
    monthCard.className = "month-calendar-block";

    // Header
    let monthTotal = 0;
    for (let day = 1; day <= lastDay; day++) {
      const dObj = new Date(year, month, day);
      const key = dObj.toISOString().slice(0, 10);
      monthTotal += (map[key] || 0);
    }

    const titleEl = document.createElement("div");
    titleEl.className = "month-calendar-title";
    titleEl.innerHTML = `<span>${monthName}</span> <span style="font-size:11px; color:var(--green);">${monthTotal} solved</span>`;
    monthCard.appendChild(titleEl);

    const gridEl = document.createElement("div");
    gridEl.className = "month-calendar-grid";

    // Padding empty cells for first day weekday alignment
    const firstDayWeekday = new Date(year, month, 1).getDay();
    for (let p = 0; p < firstDayWeekday; p++) {
      const emptyCell = document.createElement("div");
      emptyCell.className = "cell";
      emptyCell.style.opacity = "0.08";
      gridEl.appendChild(emptyCell);
    }

    // Days 1 through 31
    for (let day = 1; day <= lastDay; day++) {
      const currentDate = new Date(year, month, day);

      const key = currentDate.toISOString().slice(0, 10);
      const count = map[key] || 0;
      const cell = document.createElement("div");
      const lv = level(count);
      cell.className = "cell" + (lv ? ` l${lv}` : "");

      const dateStr = currentDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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

      gridEl.appendChild(cell);
    }

    monthCard.appendChild(gridEl);
    container.appendChild(monthCard);
  });
}

function renderMonthlyStreak(byDate) {
  const container = $("monthly-breakdown");
  if (!container) return;

  const map = byDate || {};
  const monthlyCounts = {};

  Object.entries(map).forEach(([dateStr, count]) => {
    if (!count) return;
    const monthKey = dateStr.slice(0, 7); // e.g. "2026-07"
    monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + count;
  });

  const months = Object.keys(monthlyCounts).sort().reverse();
  if (!months.length) {
    container.innerHTML = `<div style="color:var(--txt-dim); font-size:13px;">No monthly activity recorded yet. Start solving problems to track your monthly progress! 🚀</div>`;
    return;
  }

  container.innerHTML = months.map((mKey) => {
    const [y, m] = mKey.split("-");
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
    const monthName = dateObj.toLocaleString(undefined, { month: "short", year: "numeric" });
    const count = monthlyCounts[mKey];

    return `
      <div class="month-stat-card">
        <div class="month-stat-name">${monthName}</div>
        <div class="month-stat-count">${count} <span>solved</span></div>
      </div>`;
  }).join("");
}

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
        backgroundColor: "#05070d", padding: 10,
        titleColor: "#fff", bodyColor: "#cdd6e6",
        borderColor: "rgba(255,255,255,0.12)", borderWidth: 1,
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
    `<span><i style="background:${DIFF_COLORS[k] || "#8a95ad"}"></i>${k} · ${v} (${Math.round(v / total * 100)}%)</span>`
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
      datasets: [{ data: entries.map(([, v]) => v), backgroundColor: entries.map((_, i) => PALETTE[i % PALETTE.length]), borderRadius: 6, barThickness: 16 }],
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

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
    const when = it.solved_date || "";
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
          ${it.error ? `<div class="feed-error" style="color: #ff6b6b; font-size: 11px; margin-top: 4px;">Error: ${escapeHtml(it.error)}</div>` : ""}
        </div>
      </li>`;
  }).join("");
}

async function refresh() {
  const conn = $("conn");
  const data = await getStats();
  if (!data) {
    conn.className = "pill off";
    conn.innerHTML = '<span class="dot"></span> no data yet';
    lastData = { total_pushed: 0, current_streak: 0, longest_streak: 0, active_days: 0, by_date: {}, by_difficulty: {}, by_platform: {}, by_category: {}, recent: [] };
  } else {
    conn.className = "pill ok";
    conn.innerHTML = '<span class="dot"></span> live';
    lastData = data;
  }
  renderKPIs(lastData);
  renderHeatmap(lastData.by_date);
  renderMonthlyStreak(lastData.by_date);
  renderDifficulty(lastData.by_difficulty);
  renderPlatform(lastData.by_platform);
  renderCategories(lastData.by_category);
  renderFeed(lastData.recent);
}

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
  if (lastData) {
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

if (localStorage.getItem("dsa-theme") === "light") document.body.setAttribute("data-theme", "light");
refresh();
