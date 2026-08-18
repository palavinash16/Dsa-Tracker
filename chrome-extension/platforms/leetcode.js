(async () => {
  console.log("DSA Tracker: leetcode.js loaded");

  const LC = {
    platform: "leetcode",

    isAccepted() {
      // 1. High-confidence explicit submission result locators
      const selectors = [
        '[data-e2e-locator="submission-result"]',
        '[data-cy="submission-result"]',
        'div[class*="submission-result"]',
        'div[class*="result-state"]',
        '.text-sd-positive',
        '.text-green-s',
        '.text-green-0',
        '.text-green-1'
      ];

      for (const selector of selectors) {
        const els = document.querySelectorAll(selector);
        for (const el of els) {
          // Ignore header/sidebar elements (e.g. "Accepted 1.2M", "Acceptance Rate")
          if (el.closest?.('a[href*="/submissions/"], [class*="topic-tag"], [class*="description"], header')) {
            continue;
          }

          // Ignore testcase run ("Run Code") outputs
          if (el.closest?.('[data-key="testcase"], [data-key="test-result"]')) {
            continue;
          }

          const text = this.cleanText(el?.textContent || "").toLowerCase();
          if (text === "accepted" || text.startsWith("accepted")) {
            console.log("DSA Tracker: LeetCode accepted verdict detected via locator", selector, text);
            return true;
          }
        }
      }

      // 2. Specific Submission Result Panel check (strictly exclude document.body scans)
      const resultPanels = document.querySelectorAll(
        'div[class*="result-container"], div[class*="result-pane"], div[class*="submission-result"], [data-layout-path*="result"]'
      );

      for (const panel of resultPanels) {
        // Exclude testcase/run code panels
        if (panel.closest?.('[data-key="testcase"]') || panel.querySelector('[data-key="testcase"]')) {
          continue;
        }

        const text = this.cleanText(panel.innerText || panel.textContent || "").toLowerCase();
        if (
          text.includes("accepted") &&
          !text.includes("wrong answer") &&
          !text.includes("compile error") &&
          !text.includes("time limit exceeded") &&
          (text.includes("runtime") || text.includes("memory") || text.includes("beats"))
        ) {
          console.log("DSA Tracker: LeetCode accepted verdict detected in submission panel");
          return true;
        }
      }

      return false;
    },

    extract() {
      const slug = this.extractSlug(window.location.href);
      const title = this.extractTitle(slug);
      const url = slug
        ? `https://leetcode.com/problems/${slug}/`
        : window.location.href.split("?")[0];

      const payload = {
        title,
        url,
        difficulty: this.extractDifficulty(),
        tags: this.extractTags(),
        language: this.extractLanguage(),
        code: this.extractCode(),
        platform: "LeetCode",
        slug
      };

      console.log("DSA Tracker extract result:", payload);
      return payload;
    },

    cleanText(text) {
      return (text || "")
        .replace(/\u00a0/g, " ")
        .replace(/\u00c2/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    },

    slugToTitle(slug) {
      return (slug || "")
        .split("-")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    },

    extractTitle(slug) {
      const selectors = [
        'div.text-title-large a',
        'div.text-title-large',
        '[data-cy="question-title"]',
        'a[href*="/problems/"]',
        "h1"
      ];

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        const text = this.cleanText(el?.textContent || "");
        if (text && !text.toLowerCase().includes("leetcode")) {
          return text.replace(/^\d+\.\s*/, "");
        }
      }

      return this.slugToTitle(slug) || document.title.replace(" - LeetCode", "").trim();
    },

    extractDifficulty() {
      const possible = ["Easy", "Medium", "Hard"];
      const els = [...document.querySelectorAll("span, div")];

      for (const el of els) {
        const text = this.cleanText(el.textContent);
        if (possible.includes(text)) {
          return text;
        }
      }

      return "Unknown";
    },

    extractTags() {
      const tagSet = new Set();
      const tagLinks = document.querySelectorAll('a[href*="/tag/"]');

      for (const el of tagLinks) {
        const txt = this.cleanText(el.textContent);
        if (txt) tagSet.add(txt);
      }

      return [...tagSet];
    },

    extractLanguage() {
      const known = [
        "Python", "Python3", "C++", "Java", "JavaScript",
        "TypeScript", "C", "C#", "Go", "Rust", "Kotlin", "Swift"
      ];

      // 1. Try specific language selectors in LeetCode's editor header
      const langSelectors = [
        'button[id*="headlessui-popover-button"]',
        'button[class*="lang"]',
        '[data-cy="lang-select"]',
        'div[class*="popover"] button',
        'button[aria-haspopup="dialog"]',
        'button[aria-haspopup="true"]'
      ];

      for (const sel of langSelectors) {
        for (const el of document.querySelectorAll(sel)) {
          const txt = this.cleanText(el.textContent);
          if (known.includes(txt)) {
            return this.normalizeLanguage(txt);
          }
        }
      }

      // 2. Inspect code content signals
      const code = this.extractCode() || "";
      if (/#include\s*<|std::|vector</.test(code)) return "cpp";
      if (/\bdef\s+\w+/.test(code)) return "python";
      if (/\bpublic\s+class\b|\bSystem\.out\b/.test(code)) return "java";
      if (/\bfunction\s+|\bconsole\.log\b/.test(code)) return "javascript";

      // 3. Fallback scan of candidate elements
      const els = [...document.querySelectorAll("button, span, div")];
      for (const el of els) {
        const txt = this.cleanText(el.textContent);
        if (known.includes(txt)) {
          return this.normalizeLanguage(txt);
        }
      }

      return "python";
    },

    normalizeLanguage(lang) {
      const map = {
        "Python": "python",
        "Python3": "python",
        "C++": "cpp",
        "Java": "java",
        "JavaScript": "javascript",
        "TypeScript": "typescript",
        "C": "c",
        "C#": "csharp",
        "Go": "go",
        "Rust": "rust",
        "Kotlin": "kotlin",
        "Swift": "swift"
      };

      return map[lang] || lang.toLowerCase();
    },

    codeScore(code) {
      const normalized = (code || "")
        .replace(/\u00a0/g, " ")
        .replace(/\u00c2/g, "")
        .trim();

      if (normalized.length < 5) return -500;

      let score = normalized.length;
      const codeSignals = [
        /\bclass\s+\w+/,
        /\bdef\s+\w+/,
        /\breturn\b/,
        /#include\s*</,
        /\bpublic\s+class\b/,
        /\bfunction\b/,
        /\b(var|let|const|int|void|string|bool|double|float|auto|vector|struct|package|import|using)\b/,
        /\bfor\s*\(/,
        /\bwhile\s*\(/,
        /\bif\s*\(/,
        /;\s*$/m
      ];

      let hasSignal = false;
      for (const signal of codeSignals) {
        if (signal.test(normalized)) {
          score += 500;
          hasSignal = true;
        }
      }

      // Small penalty only if code has example text AND no code signals matched
      if (!hasSignal && /Example\s+\d|Constraints:/i.test(normalized)) {
        score -= 200;
      }

      return score;
    },

    textFromEditor(editor) {
      const lines = [...editor.querySelectorAll(".view-line")]
        .map((el) => (el.textContent || "").replace(/\u00a0/g, " "));

      return lines.join("\n").trim();
    },

    extractCode() {
      const candidates = [];

      for (const editor of document.querySelectorAll(".monaco-editor")) {
        const code = this.textFromEditor(editor);
        if (code) candidates.push(code);
      }

      for (const viewLines of document.querySelectorAll(".view-lines")) {
        const lines = [...viewLines.querySelectorAll(".view-line")].map(el => (el.textContent || "").replace(/\u00a0/g, " "));
        const code = lines.length ? lines.join("\n").trim() : (viewLines.innerText || viewLines.textContent || "").trim();
        if (code) candidates.push(code);
      }

      for (const el of document.querySelectorAll("textarea, pre, code")) {
        const code = (el.value || el.innerText || el.textContent || "").replace(/\u00a0/g, " ").trim();
        if (code) candidates.push(code);
      }

      const best = candidates
        .map((code) => ({ code, score: this.codeScore(code) }))
        .sort((a, b) => b.score - a.score)[0];

      if (best && best.code && best.code.length >= 5 && best.score > -400) {
        console.log("DSA Tracker: selected code candidate", {
          score: best.score,
          length: best.code.length,
          preview: best.code.slice(0, 80)
        });
        return best.code;
      }

      console.error("DSA Tracker: no usable code candidate found", candidates);
      return "";
    },

    extractSlug(url) {
      const match = url.match(/\/problems\/([^/]+)\/?/);
      return match ? match[1] : "";
    }
  };

  initPlatform(LC);
})();
