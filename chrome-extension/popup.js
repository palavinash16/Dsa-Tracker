/* popup.js — connect GitHub + show quick stats */

const $ = (id) => document.getElementById(id);

function setStatus(text, kind) {
  const el = $("status");
  el.className = "status" + (kind ? " " + kind : "");
  $("statusText").textContent = text;
}

function send(type, payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, (res) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(res || { success: false, error: "No response" });
      }
    });
  });
}

async function loadSettings() {
  const res = await send("GET_SETTINGS");
  if (!res.success) {
    setStatus("Failed to load settings.", "err");
    return;
  }
  const s = res.settings || {};
  $("githubToken").value = s.githubToken || "";
  $("repoName").value = s.repoName || "dsa-solutions";
  $("branch").value = s.branch || "main";
  $("updateExisting").checked = Boolean(s.updateExisting);

  if (s.consentGiven && s.githubToken && s.githubLogin) {
    setStatus(`Connected as @${s.githubLogin} → ${s.repoName}`, "ok");
  } else if (s.githubToken) {
    setStatus("Token saved. Click Verify to connect.", "");
  } else {
    setStatus("Click 'Connect with GitHub' to get started.", "");
  }

  const redirectEl = $("redirectUrlText");
  if (redirectEl) {
    redirectEl.textContent = chrome.identity.getRedirectURL();
  }
}

async function loadStats() {
  const res = await send("GET_STATS");
  if (!res.success) return;
  const s = res.stats || {};
  $("statPushed").textContent = s.total_pushed || 0;
  $("statStreak").textContent = s.current_streak || 0;
  $("statActive").textContent = s.active_days || 0;
}

async function saveSettings() {
  return send("SAVE_SETTINGS", {
    githubToken: $("githubToken").value,
    repoName: $("repoName").value,
    branch: $("branch").value,
    updateExisting: $("updateExisting").checked,
  });
}

/* 1-Click OAuth Flow Handler */
$("connectOAuth").addEventListener("click", async () => {
  const btn = $("connectOAuth");
  btn.disabled = true;
  setStatus("Connecting via GitHub OAuth…", "");
  await saveSettings();

  const clientId = "Ov23liZwBjk4WU4MHi9x";
  const redirectUri = chrome.identity.getRedirectURL();
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,user&redirect_uri=${encodeURIComponent(redirectUri)}`;

  chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: true,
    },
    async (responseUrl) => {
      btn.disabled = false;
      if (chrome.runtime.lastError || !responseUrl) {
        const errMessage = (chrome.runtime.lastError && chrome.runtime.lastError.message) || "";
        console.warn("launchWebAuthFlow error/cancel:", errMessage);

        // If redirect mismatch or user cancel, open pre-configured token creation link
        const fallbackUrl = "https://github.com/settings/tokens/new?description=DSA%20Tracker%20Pro&scopes=repo,user";
        chrome.tabs.create({ url: fallbackUrl });
        setStatus("Pre-configured GitHub token page opened. Generate & paste token below.", "");
        return;
      }

      try {
        const url = new URL(responseUrl);
        const code = url.searchParams.get("code");
        if (code) {
          setStatus("Authorized! Verifying connection…", "ok");
          loadSettings();
          loadStats();
        }
      } catch (e) {
        setStatus("OAuth flow completed.", "ok");
      }
    }
  );
});

// Auto-update status if background service worker completes auth
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.githubLogin || changes.githubToken)) {
    loadSettings();
    loadStats();
  }
});

/* PAT Manual Verification Handler */
$("connect").addEventListener("click", async () => {
  const btn = $("connect");
  btn.disabled = true;
  setStatus("Verifying token & repo…", "");
  await saveSettings();
  const res = await send("TEST_CONNECTION");
  btn.disabled = false;

  if (res.success) {
    setStatus(`Connected as @${res.login} → ${res.repo}`, "ok");
    loadStats();
  } else {
    setStatus(res.error || "Connection failed.", "err");
  }
});

// save quietly when inputs change
["githubToken", "repoName", "branch", "updateExisting"].forEach((id) => {
  const el = $(id);
  if (el) el.addEventListener("change", saveSettings);
});

$("dashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

loadSettings();
loadStats();
