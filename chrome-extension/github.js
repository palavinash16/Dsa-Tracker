/* ============================================================
   github.js  —  client-side GitHub layer for DSA Tracker
   Ported from the Python backend (github_service / file_manager /
   platform_classifier) so the extension needs no server.
   Loaded into the service worker via importScripts().
   ============================================================ */

const GITHUB_API = "https://api.github.com";

/* ---------- low-level request ---------- */
function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function ghFetch(token, path, options = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      ...ghHeaders(token),
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      ...(options.headers || {}),
    },
  });
  return res;
}

/* base64 that is safe for UTF-8 (emoji, accented chars, etc.) */
function toBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/* ---------- auth / repo ---------- */
async function getUser(token) {
  const res = await ghFetch(token, "/user");
  if (res.status === 401) throw new Error("Invalid or expired token.");
  if (!res.ok) throw new Error(`GitHub /user failed (${res.status}).`);
  return res.json();
}

async function getRepo(token, owner, repo) {
  const res = await ghFetch(token, `/repos/${owner}/${repo}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Could not read repo (${res.status}).`);
  return res.json();
}

async function createRepo(token, repo) {
  const res = await ghFetch(token, "/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name: repo,
      description: "My DSA solutions, auto-committed by DSA Tracker.",
      private: false,
      auto_init: true, // creates an initial README so the default branch exists
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 403 || detail.includes("Resource not accessible")) {
      throw new Error(`GitHub Token Permission Error (403): Cannot auto-create repository '${repo}'. Please manually create an empty repository named '${repo}' on GitHub, or use a PAT token with 'repo' scope.`);
    }
    throw new Error(`Failed to create repo '${repo}': ${res.status} ${detail}`);
  }
  return res.json();
}

/* Ensure repo exists, return its metadata (creating it if missing). */
async function ensureRepo(token, owner, repo) {
  const existing = await getRepo(token, owner, repo);
  if (existing) return existing;
  return createRepo(token, repo);
}

function encodePath(path) {
  return (path || "")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

async function getFileSha(token, owner, repo, path, branch) {
  const safePath = encodePath(path);
  const cacheBuster = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const res = await ghFetch(
    token,
    `/repos/${owner}/${repo}/contents/${safePath}?ref=${encodeURIComponent(branch)}&_t=${cacheBuster}`
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Could not read ${path} (${res.status}): ${detail}`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return null;
  return data.sha || null;
}

async function upsertFile(token, owner, repo, path, content, message, branch, retries = 3, overrideSha = null) {
  let sha = overrideSha || (await getFileSha(token, owner, repo, path, branch));
  const body = {
    message,
    content: toBase64Utf8(content),
    branch,
  };
  if (sha) body.sha = sha;

  const safePath = encodePath(path);
  const res = await ghFetch(token, `/repos/${owner}/${repo}/contents/${safePath}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const errJson = await res.json();
      detail = errJson.message || JSON.stringify(errJson);
    } catch (e) {
      detail = await res.text();
    }

    const isShaError =
      res.status === 409 ||
      res.status === 422 ||
      detail.toLowerCase().includes("sha") ||
      detail.toLowerCase().includes("match") ||
      detail.toLowerCase().includes("does not match");

    if (isShaError && retries > 0) {
      console.warn(`SHA conflict for ${path}, retrying (${retries} retries left)…`);
      // Extract exact 40-char SHA hex if GitHub returned it in error message
      const shaMatch = detail.match(/\b([a-f0-9]{40})\b/i);
      const nextSha = shaMatch ? shaMatch[1] : null;

      await new Promise((r) => setTimeout(r, 600));
      return upsertFile(token, owner, repo, path, content, message, branch, retries - 1, nextSha);
    }

    if (res.status === 401) {
      throw new Error("GitHub Auth Error (401): Invalid or expired token.");
    }
    if (res.status === 403) {
      throw new Error(`GitHub Permission Error (403): ${detail}. Ensure token has 'Contents: Read & write' scope.`);
    }
    if (res.status === 404) {
      throw new Error(`GitHub Repo Error (404): Repository '${owner}/${repo}' or branch '${branch}' not found.`);
    }

    throw new Error(`Upload of ${path} failed (${res.status}): ${detail}`);
  }
  return res.json();
}

/* ---------- classifier (ported from platform_classifier.py) ---------- */
const CATEGORY_KEYWORDS = {
  Arrays: ["array", "arrays", "subarray", "prefix sum", "two pointers", "sliding window"],
  Strings: ["string", "strings", "substring", "palindrome", "anagram"],
  "Linked List": ["linked list", "linkedlist", "node"],
  Stack: ["stack", "monotonic"],
  Queue: ["queue", "deque"],
  Trees: ["tree", "trees", "binary tree", "bst", "traversal"],
  Graphs: ["graph", "graphs", "bfs", "dfs", "dijkstra", "topological", "union find"],
  "Dynamic Programming": ["dynamic programming", "dp", "memo", "knapsack", "subsequence"],
  Greedy: ["greedy"],
  Backtracking: ["backtrack", "backtracking", "permutation", "combination"],
  "Binary Search": ["binary search", "search"],
  Heap: ["heap", "priority queue"],
  Hashing: ["hash", "hashing", "hashmap", "hash table"],
  Math: ["math", "number", "prime", "gcd", "modulo", "factor", "geometry"],
  "Bit Manipulation": ["bit", "bitwise", "xor", "bitmask"],
  Sorting: ["sort", "sorting", "merge sort", "quick sort"],
};

function normalizeDifficulty(difficulty) {
  const d = (difficulty || "").trim().toLowerCase();
  if (["easy", "school", "basic"].includes(d)) return "Easy";
  if (["medium", "moderate"].includes(d)) return "Medium";
  if (["hard", "difficult", "expert"].includes(d)) return "Hard";
  if (d.startsWith("easy")) return "Easy";
  if (d.startsWith("med")) return "Medium";
  if (d.startsWith("hard")) return "Hard";
  return "Unknown";
}

function getPrimaryCategory(tags, title) {
  const haystack = [...(tags || []), title || ""].join(" ").toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => haystack.includes(kw))) return category;
  }
  // fall back to a cleaned first tag if present
  if (tags && tags.length) {
    const t = tags[0].trim();
    if (t) return t.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Uncategorized";
}

/* ---------- file layout (ported from file_manager.py) ---------- */
const EXT_MAP = {
  python: "py",
  python3: "py",
  pypy: "py",
  pypy3: "py",
  cpp: "cpp",
  "c++": "cpp",
  "c++11": "cpp",
  "c++14": "cpp",
  "c++17": "cpp",
  "c++20": "cpp",
  c: "c",
  java: "java",
  javascript: "js",
  js: "js",
  typescript: "ts",
  ts: "ts",
  csharp: "cs",
  "c#": "cs",
  cs: "cs",
  go: "go",
  golang: "go",
  rust: "rs",
  kotlin: "kt",
  swift: "swift",
};

function extForLanguage(language) {
  const lang = (language || "").toLowerCase().trim();
  if (EXT_MAP[lang]) return EXT_MAP[lang];
  if (lang.includes("py")) return "py";
  if (lang.includes("c++") || lang.includes("cpp")) return "cpp";
  if (lang.includes("java") && !lang.includes("script")) return "java";
  if (lang.includes("js") || lang.includes("script")) return "js";
  if (lang.includes("cs") || lang.includes("c#")) return "cs";
  return "txt";
}

function safeName(text) {
  return (text || "")
    .trim()
    .replace(/^\d+\.\s*/, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Problem";
}

function problemMarkdown(problem, category) {
  const tags = (problem.tags || []).map((t) => `\`${t}\``).join(" ") || "—";
  return [
    `# ${problem.title}`,
    "",
    `- **Platform:** ${problem.platform}`,
    `- **Difficulty:** ${problem.difficulty}`,
    `- **Category:** ${category}`,
    `- **Language:** ${problem.language}`,
    `- **Link:** [${problem.url}](${problem.url})`,
    "",
    `**Tags:** ${tags}`,
    "",
  ].join("\n");
}

function readmeForProblem(problem, category) {
  return [
    `# ${problem.title}`,
    "",
    `Solved on **${problem.platform}** · Difficulty: **${problem.difficulty}** · Category: **${category}**`,
    "",
    `[View problem](${problem.url})`,
    "",
    "## Solution",
    "",
    "```" + (problem.language || ""),
    (problem.code || "").trim(),
    "```",
    "",
  ].join("\n");
}

/* Build the set of files (path -> content) for one solved problem. */
function buildFiles(problem, category, difficulty, config = {}) {
  const slug = safeName(problem.title);
  const root = (config.rootDirectory !== undefined ? config.rootDirectory : "DSA").trim();
  const structure = config.folderStructure || "category_only";

  let dir = "";
  if (structure === "category_difficulty") {
    dir = `${root}/${category}/${difficulty}/${slug}`;
  } else if (structure === "platform_category") {
    dir = `${root}/${problem.platform}/${category}/${slug}`;
  } else {
    // Default: simple category structure -> DSA/Arrays/Two_Sum
    dir = `${root}/${category}/${slug}`;
  }

  // Clean double slashes if root is empty
  dir = dir.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");

  const ext = extForLanguage(problem.language);
  const files = {
    [`${dir}/solution.${ext}`]: (problem.code || "").trim() + "\n",
  };

  if (config.includeProblemMd !== false) {
    files[`${dir}/problem.md`] = problemMarkdown(problem, category);
  }

  if (config.includeProblemReadme !== false) {
    files[`${dir}/README.md`] = readmeForProblem(problem, category);
  }

  return files;
}

/* ---------- root index README ---------- */
function buildRootReadme(login, repo, solved) {
  const total = solved.length;
  const rows = solved
    .slice()
    .reverse()
    .slice(0, 100)
    .map(
      (e) =>
        `| ${e.title} | ${e.platform} | ${e.difficulty} | ${e.category} | [link](${e.url}) |`
    )
    .join("\n");

  return [
    `# ${repo}`,
    "",
    `Auto-tracked DSA solutions by [@${login}](https://github.com/${login}). Powered by **DSA Tracker**.`,
    "",
    `**Total solved:** ${total}`,
    "",
    "| Problem | Platform | Difficulty | Category | Link |",
    "| --- | --- | --- | --- | --- |",
    rows,
    "",
  ].join("\n");
}

/* ---------- high-level: push one solved problem ---------- */
async function pushSolution({ token, owner, repo, branch, problem, solvedList, config = {} }) {
  const category = getPrimaryCategory(problem.tags, problem.title);
  const difficulty = normalizeDifficulty(problem.difficulty);

  const repoMeta = await ensureRepo(token, owner, repo);
  let targetBranch = branch || repoMeta.default_branch || "main";

  const files = buildFiles(problem, category, difficulty, config);

  // include an updated root index if enabled
  if (config.includeRootReadme !== false) {
    files["README.md"] = buildRootReadme(owner, repo, solvedList);
  }

  const message = `Added ${problem.title} - ${category} - ${difficulty}`;
  const results = [];

  const tryPush = async (b) => {
    const resList = [];
    const entries = Object.entries(files);
    for (let i = 0; i < entries.length; i++) {
      const [path, content] = entries[i];
      if (i > 0) {
        // Pause slightly between sequential file commits to ensure branch HEAD updates settle
        await new Promise((r) => setTimeout(r, 200));
      }
      try {
        const r = await upsertFile(token, owner, repo, path, content, message, b);
        resList.push({ path, html_url: r.content && r.content.html_url });
      } catch (err) {
        if (path.endsWith("README.md")) {
          console.warn(`README update deferred for ${path}:`, err);
        } else {
          throw err;
        }
      }
    }
    return resList;
  };

  try {
    const res = await tryPush(targetBranch);
    return { success: true, category, difficulty, branch: targetBranch, files: res };
  } catch (err) {
    const fallbackBranch = repoMeta.default_branch || "master";
    if (targetBranch !== fallbackBranch && err.message && err.message.includes("404")) {
      console.warn(`Branch '${targetBranch}' failed (404), retrying on default branch '${fallbackBranch}'...`);
      const res = await tryPush(fallbackBranch);
      return { success: true, category, difficulty, branch: fallbackBranch, files: res };
    }
    throw err;
  }
}

/* expose for the service worker */
self.GH = {
  getUser,
  ensureRepo,
  pushSolution,
  getPrimaryCategory,
  normalizeDifficulty,
  extForLanguage,
};
