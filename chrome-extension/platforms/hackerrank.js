(function () {
  console.log("DSA Tracker: hackerrank.js loaded");

  const Base = window.DSATrackerBase;

  const HackerRank = {
    platform: "hackerrank",

    isAccepted() {
      const acceptedPhrases = [
        "congratulations",
        "passed all test cases",
        "all test cases passed",
        "submission accepted",
        "score: 100",
        "status: accepted"
      ];

      const statusElements = document.querySelectorAll(
        ".submission-status, [data-analytics='SubmissionStatus'], .congratulations-heading, .submission-result-container, [class*='congratulations'], [class*='submission'], [class*='test-case'], [class*='result'], .dialog-header"
      );

      for (const el of statusElements) {
        const text = Base.normalizeText(el.textContent).toLowerCase();
        if (acceptedPhrases.some((phrase) => text.includes(phrase))) {
          console.log("DSA Tracker: HackerRank accepted verdict detected", text.slice(0, 100));
          return true;
        }
      }

      return false;
    },

    extract() {
      const slug = this.extractSlug();
      const title = this.extractTitle(slug);

      return {
        title,
        url: this.canonicalUrl(slug),
        difficulty: this.extractDifficulty(),
        tags: this.extractTags(),
        language: this.extractLanguage(),
        code: this.extractCode(),
        platform: "HackerRank",
        slug
      };
    },

    extractSlug() {
      const match = window.location.href.match(/\/challenges\/([^/?#]+)/i);
      return match ? match[1].toLowerCase() : "";
    },

    canonicalUrl(slug) {
      return slug
        ? `https://www.hackerrank.com/challenges/${slug}/problem`
        : window.location.href.split("?")[0];
    },

    extractTitle(slug) {
      const selectors = [
        ".challenge-title",
        "[data-analytics='ChallengeTitle']",
        "h1.header-title",
        ".breadcrumb-item:last-child",
        "h1"
      ];

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        const text = Base.normalizeText(el?.textContent || "");
        if (text && !text.toLowerCase().includes("hackerrank") && text.length < 120) {
          return text.replace(/\s*-\s*HackerRank.*$/i, "").trim();
        }
      }

      if (slug) {
        return slug
          .split("-")
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }

      return document.title.replace(/\s*\|\s*HackerRank.*$/i, "").trim() || "Unknown Title";
    },

    extractDifficulty() {
      const values = ["Easy", "Medium", "Hard"];

      for (const el of document.querySelectorAll(".difficulty, [class*='difficulty'], .challenge-difficulty, span")) {
        const txt = Base.normalizeText(el.textContent);
        if (values.includes(txt)) return txt;
      }

      return "Medium";
    },

    extractTags() {
      const found = new Set();

      const breadcrumbs = document.querySelectorAll(".breadcrumb-item, a[href*='/domains/'], .tag-item, [class*='tag']");
      for (const el of breadcrumbs) {
        const text = Base.normalizeText(el.textContent);
        if (text && text.length < 30 && !/hackerrank|dashboard|challenges/i.test(text)) {
          found.add(text);
        }
      }

      const defaultTags = ["Algorithms", "Data Structures", "Arrays", "Strings", "Trees", "Graphs", "Dynamic Programming"];
      const bodyText = Base.normalizeText(document.body.innerText).toLowerCase();
      for (const tag of defaultTags) {
        if (bodyText.includes(tag.toLowerCase())) found.add(tag);
      }

      return [...found];
    },

    extractLanguage() {
      const langSelectors = [
        ".select-language",
        "[data-analytics='LanguageSelect']",
        ".hr-monaco-language-select",
        "select[name='language']",
        "button[id*='language']",
        ".select-value"
      ];

      for (const sel of langSelectors) {
        const el = document.querySelector(sel);
        const text = Base.normalizeText(el?.textContent || el?.value || "").toLowerCase();
        if (text) {
          if (text.includes("python3") || text.includes("python")) return "python";
          if (text.includes("c++") || text.includes("cpp")) return "cpp";
          if (text.includes("java")) return "java";
          if (text.includes("c#")) return "csharp";
          if (text.includes("javascript") || text.includes("js")) return "javascript";
          if (text.includes("go")) return "go";
          if (text.includes("rust")) return "rust";
        }
      }

      const bodyText = Base.normalizeText(document.body.innerText).toLowerCase();
      if (bodyText.includes("python 3") || bodyText.includes("pypy")) return "python";
      if (bodyText.includes("c++14") || bodyText.includes("c++20") || bodyText.includes("c++17")) return "cpp";

      return "python";
    },

    extractCode() {
      return Base.extractCodeFromPage();
    }
  };

  initPlatform(HackerRank);
})();
