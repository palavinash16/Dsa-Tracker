(function () {
  console.log("DSA Tracker: codechef.js loaded");

  const Base = window.DSATrackerBase;

  const CodeChef = {
    platform: "codechef",

    isAccepted() {
      const statusEls = document.querySelectorAll(
        ".submission-status, [class*='status'], [class*='verdict'], .verdict-heading, .status-cell"
      );
      const phrases = ["accepted", "correct answer", "100 pts", "100/100", "successful submission"];

      for (const el of statusEls) {
        const text = Base.normalizeText(el.textContent).toLowerCase();
        if (phrases.some((p) => text.includes(p))) {
          console.log("DSA Tracker: CodeChef accepted verdict detected", text.slice(0, 80));
          return true;
        }
      }

      return false;
    },

    extract() {
      const title = this.extractTitle();

      return {
        title,
        url: this.canonicalUrl(),
        difficulty: "Unknown",
        tags: this.extractTags(),
        language: this.extractLanguage(),
        code: this.extractCode(),
        platform: "CodeChef",
        slug: this.extractSlug() || Base.slugify(title)
      };
    },

    extractSlug() {
      const match = window.location.href.match(/\/(?:problems|submit|viewsolution|practice\/course\/[^\/]+\/[^\/]+\/problems)\/([^/?#]+)/i) ||
                    window.location.href.match(/\/problems\/([^/?#]+)/i);
      return match ? match[1].toLowerCase() : "";
    },

    canonicalUrl() {
      const slug = this.extractSlug();
      return slug
        ? `https://www.codechef.com/problems/${slug.toUpperCase()}`
        : window.location.href.split("?")[0];
    },

    extractTitle() {
      const selectors = [
        "h1",
        ".problem-statement h3",
        "[class*='problem'] h3",
        "[class*='title']"
      ];

      for (const selector of selectors) {
        const text = Base.normalizeText(document.querySelector(selector)?.textContent || "");
        if (text && text.length < 140) return text;
      }

      return this.extractSlug().toUpperCase() || document.title.replace("CodeChef", "").trim();
    },

    extractTags() {
      const found = new Set();
      for (const el of document.querySelectorAll("a, span, div")) {
        const text = Base.normalizeText(el.textContent);
        if (/^(array|string|math|greedy|dp|dynamic programming|graph|tree|sorting|binary search)$/i.test(text)) {
          found.add(text.replace(/^dp$/i, "Dynamic Programming"));
        }
      }
      return [...found];
    },

    extractLanguage() {
      const text = Base.normalizeText(document.body.innerText).toLowerCase();
      const languageMap = [
        ["python", "python"],
        ["pypy", "python"],
        ["c++", "cpp"],
        ["cpp", "cpp"],
        ["java", "java"],
        ["javascript", "javascript"],
        ["c#", "csharp"],
        [" go ", "go"],
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

  initPlatform(CodeChef);
})();
