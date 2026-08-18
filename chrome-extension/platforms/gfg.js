(function () {
  console.log("DSA Tracker: gfg.js loaded");

  const Base = window.DSATrackerBase;

  const GFG = {
    platform: "gfg",

    isAccepted() {
      const explicitSuccess = [
        "problem solved successfully",
        "all test cases passed",
        "correct answer",
        "submitted successfully",
        "total test cases passed",
        "submission accepted",
        "test cases passed"
      ];

      const statusContainers = document.querySelectorAll(
        ".problems_submission_result_container, .result-details, .problems_solved_successfully, [class*='problemSolved'], [class*='problem_solved'], [class*='result'], [class*='submission'], [class*='status'], [class*='success'], [class*='response'], [class*='output'], [class*='card'], [class*='modal'], [class*='message'], [class*='toast'], [class*='banner'], [class*='alert']"
      );

      for (const el of statusContainers) {
        if (el.closest?.(".problem-statement, .problems_header_content, header, nav, .navbar")) continue;

        const txt = Base.normalizeText(el.textContent).toLowerCase();
        if (!txt) continue;

        const phrase = explicitSuccess.find((candidate) => txt.includes(candidate)) ||
          (txt.includes("test cases passed") && (txt.includes("100") || txt.includes("total") || txt.includes("accuracy")));

        if (phrase) {
          console.log("DSA Tracker: GFG accepted verdict detected in container", phrase, txt.slice(0, 100));
          return true;
        }
      }

      const successBadges = document.querySelectorAll(
        "[class*='solved'], [class*='Correct'], [class*='correct'], .ui.message.success, .problems_solved_successfully"
      );
      for (const badge of successBadges) {
        if (badge.closest?.(".problem-statement, .problems_header_content, header, nav, .navbar")) continue;
        const txt = Base.normalizeText(badge.textContent).toLowerCase();
        if (txt.includes("correct answer") || txt.includes("problem solved") || txt.includes("successfully") || txt.includes("passed")) {
          console.log("DSA Tracker: GFG accepted verdict detected in badge", txt.slice(0, 80));
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
        difficulty: this.extractDifficulty(),
        tags: this.extractTags(),
        language: this.extractLanguage(),
        code: this.extractCode(),
        platform: "GFG",
        slug: Base.slugify(title)
      };
    },

    canonicalUrl() {
      const match = window.location.href.match(/\/problems\/([^/?#]+)/i);
      return match
        ? `https://www.geeksforgeeks.org/problems/${match[1]}/`
        : window.location.href.split("?")[0];
    },

    slugFromUrl() {
      const match = window.location.href.match(/\/problems\/([^/?#]+)/i);
      return match ? match[1] : "";
    },

    titleFromSlug() {
      const slug = this.slugFromUrl()
        .replace(/-\d+$/g, "")
        .replace(/\d+$/g, "");

      if (!slug) return "";

      return slug
        .split("-")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    },

    extractTitle() {
      const slugTitle = this.titleFromSlug();
      const titleEl =
        document.querySelector("h1") ||
        document.querySelector(".problems_header_content h1") ||
        document.querySelector(".problemName");

      const domTitle = Base.normalizeText(titleEl?.textContent || "")
        .replace(/\s*-\s*GeeksforGeeks.*$/i, "")
        .replace(/\s*\|\s*Practice.*$/i, "");

      if (
        domTitle
        && !/soln|solution|using map|comment|article/i.test(domTitle)
        && domTitle.length < 90
      ) {
        return domTitle;
      }

      return slugTitle || Base.normalizeText(document.title || "Unknown Title")
        .replace(/\s*-\s*GeeksforGeeks.*$/i, "")
        .replace(/\s*\|\s*Practice.*$/i, "");
    },

    extractDifficulty() {
      const values = ["Easy", "Medium", "Hard", "Basic", "School"];
      const els = [...document.querySelectorAll("div, span, p")];

      for (const el of els) {
        const txt = Base.normalizeText(el.textContent);
        if (values.includes(txt)) return txt;
      }

      return "Unknown";
    },

    extractTags() {
      const possible = [
        "Array", "String", "Dynamic Programming", "Graph", "Tree", "Greedy",
        "Sliding Window", "Two Pointers", "Linked List", "Stack", "Queue",
        "Heap", "Binary Search", "Backtracking", "Recursion", "Matrix",
        "Math", "Sorting", "Hash", "Hash Table"
      ];
      const found = new Set();

      for (const el of document.querySelectorAll("a, span, div")) {
        const txt = Base.normalizeText(el.textContent);
        if (possible.includes(txt)) found.add(txt);
      }

      return [...found];
    },

    extractLanguage() {
      // 1. Try explicit GFG language dropdown/button controls
      const selectors = [
        ".ant-select-selection-item",
        "[class*='language-select']",
        "[class*='LanguageSelect']",
        ".header-dropdown",
        "button[class*='lang']",
        "select[class*='lang']"
      ];

      for (const sel of selectors) {
        for (const el of document.querySelectorAll(sel)) {
          const txt = Base.normalizeText(el.textContent || el.value || "").toLowerCase();
          if (txt) {
            if (txt.includes("c++") || txt.includes("cpp")) return "cpp";
            if (txt.includes("python3") || txt.includes("python")) return "python";
            if (txt.includes("java")) return "java";
            if (txt.includes("javascript") || txt.includes("js")) return "javascript";
            if (txt.includes("c#") || txt.includes("csharp")) return "csharp";
            if (txt === "c" || txt.includes("c language")) return "c";
          }
        }
      }

      // 2. Inspect extracted solution code directly for language signatures
      const code = this.extractCode() || "";
      if (/#include\s*<|std::|vector</.test(code)) return "cpp";
      if (/\bdef\s+\w+|\bimport\s+sys\b/.test(code)) return "python";
      if (/\bpublic\s+class\b|\bSystem\.out\b/.test(code)) return "java";
      if (/\bfunction\s+|\bconsole\.log\b/.test(code)) return "javascript";

      return "cpp";
    },

    extractCode() {
      // 1. Try GFG Ace Editor lines (preserving empty lines)
      const aceEls = document.querySelectorAll(".ace_line, [class*='ace_line']");
      if (aceEls.length > 0) {
        const aceLines = [...aceEls].map((el) => (el.textContent || "").replace(/\u00a0/g, " "));
        const code = aceLines.join("\n").trim();
        if (code.length >= 5) {
          console.log("DSA Tracker: extracted code from GFG Ace Editor, length:", code.length);
          return code;
        }
      }

      // 2. Try GFG Monaco Editor lines (preserving empty lines)
      const monacoEls = document.querySelectorAll(".view-line, [class*='view-line']");
      if (monacoEls.length > 0) {
        const monacoLines = [...monacoEls].map((el) => (el.textContent || "").replace(/\u00a0/g, " "));
        const code = monacoLines.join("\n").trim();
        if (code.length >= 5) {
          console.log("DSA Tracker: extracted code from GFG Monaco Editor, length:", code.length);
          return code;
        }
      }

      // 3. Try code containers
      for (const container of document.querySelectorAll(".ace_editor, .monaco-editor, [class*='editor'], [class*='code']")) {
        const text = (container.innerText || container.textContent || "").replace(/\u00a0/g, " ").trim();
        if (text && text.length >= 5 && !text.includes("Example 1:") && !text.includes("Explanation:")) {
          console.log("DSA Tracker: extracted code from GFG container, length:", text.length);
          return text;
        }
      }

      // 4. Fallback to base extractor
      return Base.extractCodeFromPage();
    }
  };

  initPlatform(GFG);
})();
