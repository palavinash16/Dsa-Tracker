/* ============================================================
   background.js  —  DSA Tracker service worker
   Pushes accepted solutions straight to GitHub (no backend) and
   maintains stats + streak in chrome.storage.
   ============================================================ */

importScripts("github.js");

const DEFAULTS = {
  consentGiven: false,
  githubToken: "",
  githubLogin: "",
  repoName: "dsa-solutions",
  branch: "main",
  updateExisting: true,
  rootDirectory: "DSA",
  folderStructure: "category_only",
  includeProblemMd: true,
  includeProblemReadme: true,
  includeRootReadme: true,
  lastSentProblemKey: null,
  stats: { solved: [] },
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const merged = { ...DEFAULTS, ...existing };
  await chrome.storage.local.set(merged);
});

/* ---------- message router ---------- */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handlers = {
    GET_SETTINGS: handleGetSettings,
    SAVE_SETTINGS: () => handleSaveSettings(message.payload),
    SET_CONSENT: handleSetConsent,
    TEST_CONNECTION: handleTestConnection,
    GET_STATS: handleGetStats,
    SUBMIT_PROBLEM: () => handleProblemSubmission(message.payload),
    START_OAUTH_FLOW: handleStartOAuthFlow,
  };

  const handler = handlers[message.type];
  if (!handler) return false;

  Promise.resolve(handler())
    .then((result) => sendResponse({ success: true, ...result }))
    .catch((error) => sendResponse({ success: false, error: error.message || String(error) }));

  return true; // keep the channel open for the async response
});

/* ---------- OAuth Authorization Flow ---------- */
const GITHUB_OAUTH_CLIENT_ID = "Ov23liZwBjk4WU4MHi9x"; // Registered GitHub OAuth Client ID

async function pollDeviceAuth(device_code, interval, expires_in) {
  const startTime = Date.now();
  const pollInterval = Math.max((interval || 5) * 1000, 3000);

  while (Date.now() - startTime < (expires_in || 900) * 1000) {
    await new Promise((r) => setTimeout(r, pollInterval));

    try {
      const pollRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_OAUTH_CLIENT_ID,
          device_code,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      });

      const pollData = await pollRes.json();

      if (pollData.access_token) {
        const token = pollData.access_token;
        const user = await GH.getUser(token);
        const repoName = (await chrome.storage.local.get("repoName")).repoName || DEFAULTS.repoName;
        const repo = await GH.ensureRepo(token, user.login, repoName);

        await chrome.storage.local.set({
          githubToken: token,
          githubLogin: user.login,
          consentGiven: true,
        });

        notify("Connected to GitHub ✓", `Authenticated as @${user.login}`);
        return;
      }

      if (pollData.error && pollData.error !== "authorization_pending" && pollData.error !== "slow_down") {
        console.warn("Device auth poll stopped:", pollData.error);
        return;
      }
    } catch (e) {
      console.warn("Polling error", e);
    }
  }
}

async function handleStartOAuthFlow() {
  try {
    const res = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_OAUTH_CLIENT_ID,
        scope: "repo,user",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const { device_code, user_code, verification_uri, interval, expires_in } = data;

      if (verification_uri) {
        chrome.tabs.create({ url: `${verification_uri}?user_code=${encodeURIComponent(user_code)}` });
      }

      // Start polling asynchronously in background (non-blocking)
      pollDeviceAuth(device_code, interval, expires_in);

      return {
        status: "device_code_sent",
        user_code,
        message: `Verification tab opened! Confirm code: ${user_code}`,
      };
    }
  } catch (err) {
    console.warn("OAuth device flow endpoint unavailable, opening OAuth authorization page", err);
  }

  // Fallback: Open GitHub OAuth Authorize page with registered Client ID
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_OAUTH_CLIENT_ID}&scope=repo,user`;
  chrome.tabs.create({ url: authUrl });

  return {
    status: "token_page_opened",
    message: "GitHub OAuth page opened with Client ID. Complete authorization on GitHub.",
  };
}

/* ---------- settings ---------- */
async function handleGetSettings() {
  const keys = [
    "consentGiven", "githubToken", "githubLogin", "repoName", "branch",
    "updateExisting", "rootDirectory", "folderStructure",
    "includeProblemMd", "includeProblemReadme", "includeRootReadme"
  ];
  const settings = await chrome.storage.local.get(keys);
  return { settings: { ...DEFAULTS, ...settings } };
}

async function handleSaveSettings(payload = {}) {
  const patch = {};
  if (payload.githubToken !== undefined) patch.githubToken = payload.githubToken.trim();
  if (payload.repoName !== undefined) patch.repoName = payload.repoName.trim() || DEFAULTS.repoName;
  if (payload.branch !== undefined) patch.branch = payload.branch.trim() || DEFAULTS.branch;
  if (payload.updateExisting !== undefined) patch.updateExisting = Boolean(payload.updateExisting);
  if (payload.rootDirectory !== undefined) patch.rootDirectory = payload.rootDirectory.trim();
  if (payload.folderStructure !== undefined) patch.folderStructure = payload.folderStructure;
  if (payload.includeProblemMd !== undefined) patch.includeProblemMd = Boolean(payload.includeProblemMd);
  if (payload.includeProblemReadme !== undefined) patch.includeProblemReadme = Boolean(payload.includeProblemReadme);
  if (payload.includeRootReadme !== undefined) patch.includeRootReadme = Boolean(payload.includeRootReadme);

  await chrome.storage.local.set(patch);
  return { settings: patch };
}

async function handleSetConsent() {
  await chrome.storage.local.set({ consentGiven: true });
  return {};
}

/* Validate token + ensure repo exists. Called by the "Connect" button. */
async function handleTestConnection() {
  const { githubToken, repoName, branch } = await chrome.storage.local.get([
    "githubToken",
    "repoName",
    "branch",
  ]);
  if (!githubToken) throw new Error("Paste a GitHub token first.");

  const user = await GH.getUser(githubToken);
  const repo = await GH.ensureRepo(githubToken, user.login, repoName || DEFAULTS.repoName);

  await chrome.storage.local.set({ githubLogin: user.login, consentGiven: true });
  return {
    login: user.login,
    repo: repo.full_name,
    branch: branch || repo.default_branch || "main",
    created: !repo.updated_at || repo.size === 0,
  };
}

/* ---------- stats ---------- */
function parseDate(value) {
  const d = new Date(value);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

function calcStreaks(dates) {
  const set = new Set(dates);
  if (!set.size) return { current_streak: 0, longest_streak: 0 };

  const today = new Date();
  let current = 0;
  const cursor = new Date(today);
  while (set.has(cursor.toISOString().slice(0, 10))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const ds of sorted) {
    const d = new Date(ds);
    if (prev && (d - prev) === 86400000) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current_streak: current, longest_streak: longest };
}

function buildStats(solved) {
  const pushed = solved.filter((s) => s.status === "pushed");
  const byDate = {};
  const byPlatform = {};
  const byCategory = {};
  const byDifficulty = {};

  for (const p of pushed) {
    if (p.solved_date) byDate[p.solved_date] = (byDate[p.solved_date] || 0) + 1;
    byPlatform[p.platform || "Unknown"] = (byPlatform[p.platform || "Unknown"] || 0) + 1;
    byCategory[p.category || "Uncategorized"] = (byCategory[p.category || "Uncategorized"] || 0) + 1;
    byDifficulty[p.difficulty || "Unknown"] = (byDifficulty[p.difficulty || "Unknown"] || 0) + 1;
  }

  const solvedDates = Object.keys(byDate);
  return {
    total_tracked: solved.length,
    total_pushed: pushed.length,
    total_failed: solved.filter((s) => s.status === "failed").length,
    active_days: solvedDates.length,
    ...calcStreaks(solvedDates),
    by_platform: byPlatform,
    by_category: byCategory,
    by_difficulty: byDifficulty,
    by_date: byDate,
    recent: solved.slice(-10).reverse(),
  };
}

async function handleGetStats() {
  const { stats } = await chrome.storage.local.get("stats");
  const solved = (stats && stats.solved) || [];
  return { stats: buildStats(solved) };
}

/* ---------- the main event: a solved problem arrives ---------- */
async function handleProblemSubmission(payload) {
  const settings = await chrome.storage.local.get([
    "consentGiven",
    "githubToken",
    "githubLogin",
    "repoName",
    "branch",
    "updateExisting",
    "rootDirectory",
    "folderStructure",
    "includeProblemMd",
    "includeProblemReadme",
    "includeRootReadme",
    "lastSentProblemKey",
    "stats",
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const category = GH.getPrimaryCategory(payload.tags, payload.title);
  const difficulty = GH.normalizeDifficulty(payload.difficulty);
  const langExt = GH.extForLanguage(payload.language);
  const problemKey = `${payload.platform}::${payload.slug || payload.url}::${langExt}`;

  const stats = settings.stats || { solved: [] };
  const solved = stats.solved || [];
  const existingIndex = solved.findIndex((s) => s.problem_key === problemKey);
  const alreadyPushed = existingIndex !== -1 && solved[existingIndex].status === "pushed";

  const entry = {
    title: payload.title || "Untitled Problem",
    url: payload.url || "",
    platform: payload.platform || "DSA Tracker",
    language: payload.language || "code",
    category,
    difficulty,
    status: "failed",
    problem_key: problemKey,
    solved_date: today,
    solved_at: new Date().toISOString(),
  };

  try {
    if (!settings.githubToken) {
      throw new Error("No GitHub token saved. Click Extension Icon → Paste PAT Token → Save & Verify.");
    }

    if (alreadyPushed && !payload.force) {
      // Problem was already pushed to GitHub previously.
      // Avoid pushing duplicate file commits to GitHub, but count this practice towards today's streak & stats!
      const updatedSolved = [...solved];
      updatedSolved[existingIndex] = {
        ...updatedSolved[existingIndex],
        solved_date: today,
        solved_at: new Date().toISOString(),
      };

      await chrome.storage.local.set({
        stats: { solved: updatedSolved },
        lastSentProblemKey: problemKey,
      });

      const streak = calcStreaks(updatedSolved.filter((s) => s.status === "pushed").map((s) => s.solved_date));

      notify(
        "Practice Counted 🔥",
        `${payload.title} · ${difficulty}\n🔥 ${streak.current_streak}-day streak maintained!`
      );

      return {
        result: {
          skipped: true,
          reason: "Already in GitHub repository. Practice streak & dashboard stats updated!",
          streak,
        },
      };
    }

    // resolve owner login (cached, or fetch once)
    let login = settings.githubLogin;
    if (!login) {
      const user = await GH.getUser(settings.githubToken);
      login = user.login;
      await chrome.storage.local.set({ githubLogin: login, consentGiven: true });
    }

    const problem = {
      title: payload.title,
      url: payload.url,
      platform: payload.platform,
      language: payload.language,
      code: payload.code,
      difficulty: payload.difficulty,
      tags: payload.tags,
    };

    const pushedEntry = { ...entry, status: "pushed", error: null };
    let provisional;
    if (existingIndex !== -1) {
      provisional = [...solved];
      provisional[existingIndex] = { ...provisional[existingIndex], ...pushedEntry };
    } else {
      provisional = [...solved, pushedEntry];
    }

    const gh = await GH.pushSolution({
      token: settings.githubToken,
      owner: login,
      repo: settings.repoName || DEFAULTS.repoName,
      branch: settings.branch,
      problem,
      solvedList: provisional,
      config: {
        rootDirectory: settings.rootDirectory !== undefined ? settings.rootDirectory : DEFAULTS.rootDirectory,
        folderStructure: settings.folderStructure || DEFAULTS.folderStructure,
        includeProblemMd: settings.includeProblemMd !== false,
        includeProblemReadme: settings.includeProblemReadme !== false,
        includeRootReadme: settings.includeRootReadme !== false,
      },
    });

    await chrome.storage.local.set({
      stats: { solved: provisional },
      lastSentProblemKey: problemKey,
    });

    const streak = calcStreaks(provisional.filter((s) => s.status === "pushed").map((s) => s.solved_date));
    notify(
      "Pushed to GitHub ✓",
      `${payload.title} · ${difficulty}\n🔥 ${streak.current_streak}-day streak`
    );
    return { result: { ...gh, streak } };
  } catch (error) {
    const errorMsg = error.message || String(error);
    const failedEntry = { ...entry, status: "failed", error: errorMsg };
    let withFailure;
    if (existingIndex !== -1) {
      withFailure = [...solved];
      withFailure[existingIndex] = { ...withFailure[existingIndex], ...failedEntry };
    } else {
      withFailure = [...solved, failedEntry];
    }

    await chrome.storage.local.set({ stats: { solved: withFailure } });
    notify("Push Failed", errorMsg);
    throw error;
  }
}

/* ---------- notifications ----------
   Auto-dismisses after a few seconds so the user never has to click it. */
function notify(title, message, autoCloseMs = 4000) {
  try {
    const id = `dsa-${Date.now()}`;
    chrome.notifications.create(id, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title,
      message,
      priority: 0,
      requireInteraction: false,
    });
    // auto-clear so it disappears on its own
    setTimeout(() => chrome.notifications.clear(id), autoCloseMs);
  } catch (e) {
    console.warn("notify failed", e);
  }
}

/* clicking the toast just closes it (no action needed) */
chrome.notifications.onClicked.addListener((id) => chrome.notifications.clear(id));

/* ---------- daily streak reminder ---------- */
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("streak-check", { periodInMinutes: 60 * 6 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "streak-check") return;
  const { stats } = await chrome.storage.local.get("stats");
  const solved = (stats && stats.solved) || [];
  const dates = solved.filter((s) => s.status === "pushed").map((s) => s.solved_date);
  const today = new Date().toISOString().slice(0, 10);
  const { current_streak } = calcStreaks(dates);
  if (current_streak > 0 && !dates.includes(today)) {
    notify("Keep your streak alive 🔥", `You're on a ${current_streak}-day streak. Solve one today!`);
  }
});
