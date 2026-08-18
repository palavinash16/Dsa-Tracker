(function () {
  console.log("DSA Tracker: codeforces.js loaded");

  const Base = window.DSATrackerBase;

  const Codeforces = {
    platform: "codeforces",

    isAccepted() {
      const verdictEl = document.querySelector(".verdict-accepted, span.verdict-ok, td.status-verdict");
      const text = Base.normalizeText(verdictEl?.textContent || "").toLowerCase();
      return text.includes("accepted") || text.includes("verdict: ok") || text === "ok";
    },

    extract() {
      const title = this.extractTitle();
      const slug = this.extractSlug(title);

      return {
        title,
        url: this.canonicalUrl(slug),
        difficulty: this.extractDifficulty(),
        tags: this.extractTags(),
        language: this.extractLanguage(),
        code: this.extractCode(),
        platform: "Codeforces",
        slug
      };
    },

    extractSlug(title) {
      const contestMatch = window.location.href.match(/\/(?:contest|problemset\/problem)\/(\d+)\/(?:problem\/)?([A-Z]\d?)/i);
      if (contestMatch) {
        return `${contestMatch[1]}-${contestMatch[2].toUpperCase()}`.toLowerCase();
      }

      return Base.slugify(title);
    },

    canonicalUrl(slug) {
      const match = slug.match(/^(\d+)-([a-z]\d?)$/i);
      return match
        ? `https://codeforces.com/problemset/problem/${match[1]}/${match[2].toUpperCase()}`
        : window.location.href.split("?")[0];
    },

    extractTitle() {
      const selectors = [
        ".problem-statement .title",
        ".header .title",
        "h1"
      ];

      for (const selector of selectors) {
        const text = Base.normalizeText(document.querySelector(selector)?.textContent || "");
        if (text) return text.replace(/^[A-Z]\d?\.\s*/, "");
      }

      return document.title.replace("Codeforces", "").trim() || "Unknown Title";
    },

    extractDifficulty() {
      const rating = Base.normalizeText(document.querySelector(".tag-box[title*='difficulty']")?.textContent || "");
      return rating || "Unknown";
    },

    extractTags() {
      return [...document.querySelectorAll(".tag-box")]
        .map((el) => Base.normalizeText(el.textContent))
        .filter((tag) => tag && !/^\*\d+/.test(tag));
    },

    extractLanguage() {
      const text = Base.normalizeText(document.body.innerText).toLowerCase();
      const languageMap = [
        ["python", "python"],
        ["pyPy".toLowerCase(), "python"],
        ["gnu c++", "cpp"],
        ["c++", "cpp"],
        ["java", "java"],
        ["javascript", "javascript"],
        ["c#", "csharp"],
        ["go", "go"],
        ["rust", "rust"],
        ["kotlin", "kotlin"]
      ];

      for (const [needle, language] of languageMap) {
        if (text.includes(needle)) return language;
      }

      return "cpp";
    },

    extractCode() {
      return Base.extractCodeFromPage();
    }
  };

  initPlatform(Codeforces);
})();
