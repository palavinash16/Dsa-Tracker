console.log("DSA Tracker: base.js loaded");

window.DSATrackerBase = {
  normalizeText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  },

  cleanCodeText(text) {
    return (text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\u00c2/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  },

  slugify(text) {
    return (text || "")
      .toLowerCase()
      .replace(/^\d+\.\s*/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  },

  extractCodeFromPage() {
    const candidates = [];

    for (const editor of document.querySelectorAll(".monaco-editor, .CodeMirror, .ace_editor, [class*='monaco'], [class*='CodeMirror'], [class*='ace_editor'], [class*='editor-container']")) {
      const lineEls = editor.querySelectorAll(".view-line, .CodeMirror-line, .ace_line, [class*='view-line'], [class*='CodeMirror-line'], [class*='ace_line']");
      let code = "";
      if (lineEls.length > 0) {
        code = [...lineEls].map((el) => (el.textContent || "").replace(/\u00a0/g, " ")).join("\n").trim();
      } else {
        code = (editor.innerText || editor.textContent || "").replace(/\u00a0/g, " ").trim();
      }
      if (code) candidates.push(code);
    }

    for (const el of document.querySelectorAll(".view-lines, [class*='view-lines'], textarea, pre, code")) {
      const code = (el.value || el.innerText || el.textContent || "").replace(/\u00a0/g, " ").trim();
      if (code) candidates.push(code);
    }

    const scored = candidates
      .map((code) => ({ code, score: this.codeScore(code) }))
      .sort((a, b) => b.score - a.score);

    if (scored[0] && scored[0].code && scored[0].code.length >= 5) {
      console.log("DSA Tracker: selected code candidate", {
        score: scored[0].score,
        length: scored[0].code.length,
        preview: scored[0].code.slice(0, 80)
      });
      return scored[0].code;
    }

    console.error("DSA Tracker: no usable code candidate found", candidates);
    return "";
  },

  codeScore(code) {
    const normalized = (code || "").replace(/\u00a0/g, " ").trim();
    if (normalized.length < 5) return -100;

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

    let hasCodeSignal = false;
    for (const signal of codeSignals) {
      if (signal.test(normalized)) {
        score += 500;
        hasCodeSignal = true;
      }
    }

    if (!hasCodeSignal && /Example\s+\d|Constraints:/i.test(normalized)) {
      score -= 200;
    }

    return score;
  },

  getRepoRoot() {
    return "";
  },

  sendProblemToBackground(problemData, isManualClick = false, callback = null) {
    if (isManualClick) {
      problemData.force = true;
    }
    console.log("DSA Tracker: sending to background", JSON.stringify(problemData, null, 2));

    chrome.runtime.sendMessage(
      {
        type: "SUBMIT_PROBLEM",
        payload: problemData
      },
      (response) => {
        if (chrome.runtime.lastError) {
          const errStr = chrome.runtime.lastError.message;
          console.error("DSA Tracker runtime error:", errStr);
          if (callback) callback({ success: false, error: errStr });
          return;
        }
        console.log("DSA Tracker response:", JSON.stringify(response, null, 2));
        if (callback) callback(response);
      }
    );
  },

  captureAndSend(extractor, isManualClick = false) {
    const btn = document.getElementById("dsa-tracker-capture-btn");
    const originalText = "Track DSA 🛠️";
    const defaultBg = "linear-gradient(135deg, #0f766e, #0d9488)";

    if (btn && isManualClick) {
      btn.textContent = "Pushing... ⏳";
      btn.style.opacity = "0.85";
    }

    const resetBtn = (text, bg, duration = 3000) => {
      if (!btn) return;
      btn.textContent = text;
      btn.style.background = bg;
      btn.style.opacity = "1";
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = defaultBg;
      }, duration);
    };

    try {
      let isAccepted = false;
      try {
        isAccepted = Boolean(extractor.isAccepted());
      } catch (e) {
        console.warn("DSA Tracker: isAccepted check threw error", e);
      }

      if (!isAccepted) {
        if (!isManualClick) {
          console.log("DSA Tracker: auto-capture skipped - submission not accepted/verified yet");
          return;
        } else {
          console.warn("DSA Tracker: manual capture blocked - submission not accepted/verified");
          resetBtn("Not Accepted ✕", "linear-gradient(135deg, #dc2626, #b91c1c)", 4000);
          alert("DSA Tracker - Cannot Push:\n\nNo 'Accepted' submission verified for this problem. Please submit a correct solution and make sure it passes all test cases first.");
          return;
        }
      }

      const data = extractor.extract();

      if (!data) {
        console.error("DSA Tracker: extractor returned no data");
        if (isManualClick) resetBtn("Failed ✕", "linear-gradient(135deg, #dc2626, #b91c1c)", 3000);
        return;
      }

      data.repo_root = this.getRepoRoot();

      if (!data.code || data.code.trim().length < 5) {
        if (isManualClick) {
          alert("DSA Tracker: No solution code detected in editor! Please write and submit your solution first.");
          resetBtn(originalText, defaultBg, 0);
        }
        return;
      }

      console.log("DSA Tracker: extracted data", JSON.stringify(data, null, 2));
      this.sendProblemToBackground(data, isManualClick, (response) => {
        if (response && response.success) {
          if (isManualClick) {
            resetBtn("Pushed! ✓", "linear-gradient(135deg, #16a34a, #15803d)", 3500);
          }
        } else {
          const errorMsg = (response && response.error) || "Push failed. Check GitHub settings.";
          if (isManualClick) {
            resetBtn("Push Failed ✕", "linear-gradient(135deg, #dc2626, #b91c1c)", 4000);
            alert(`DSA Tracker - Push Failed:\n\n${errorMsg}\n\nPlease click the extension icon to verify your GitHub PAT Token.`);
          }
        }
      });
    } catch (error) {
      console.error("DSA Tracker extract/send error:", error);
      if (isManualClick) {
        resetBtn("Push Failed ✕", "linear-gradient(135deg, #dc2626, #b91c1c)", 4000);
        alert(`DSA Tracker - Error:\n\n${error.message || String(error)}`);
      }
    }
  },

  listenForSubmitClicks() {
    let lastSubmitTime = 0;
    let userClickedSubmit = false;

    const handleSubmitClick = (e) => {
      let target = e.target;
      if (!target) return;

      let depth = 0;
      while (target && depth < 4) {
        const text = (target.innerText || target.textContent || target.value || "").toLowerCase().trim();

        // Exclude "Run Code" or "Run" or "Compile" buttons
        const isRun = text.includes("run code") || text.includes("compile") || text === "run";
        if (isRun) return;

        const isSubmit =
          text === "submit" ||
          text.startsWith("submit") ||
          text.includes("submit solution") ||
          text.includes("submit code") ||
          (target.className && typeof target.className === "string" && /submit/i.test(target.className)) ||
          (target.id && typeof target.id === "string" && /submit/i.test(target.id)) ||
          target.matches?.('[data-e2e-locator="console-submit-button"], [data-cy="submit-code-btn"], .problems_submit_button__ui_, button.hr-monaco-submit, input[type="submit"]');

        if (isSubmit) {
          console.log("DSA Tracker: user clicked SUBMIT button!", target);
          userClickedSubmit = true;
          lastSubmitTime = Date.now();
          return;
        }

        target = target.parentElement;
        depth++;
      }
    };

    document.addEventListener("click", handleSubmitClick, true);

    return {
      wasSubmittedRecently: () => userClickedSubmit && (Date.now() - lastSubmitTime < 300000), // 5 minute window
      markPushed: () => { userClickedSubmit = false; },
      flagSubmitted: () => { userClickedSubmit = true; lastSubmitTime = Date.now(); }
    };
  },

  waitForAccepted(checkFn, callback) {
    let hasTriggered = false;

    const check = () => {
      if (hasTriggered) return;
      try {
        if (checkFn()) {
          console.log("DSA Tracker: accepted verdict verified!");
          callback();
        }
      } catch (e) {
        console.error("DSA Tracker waitForAccepted check error:", e);
      }
    };

    check();

    const intervalId = setInterval(() => {
      check();
    }, 1500);

    try {
      const observer = new MutationObserver(() => check());
      const target = document.body || document.documentElement;
      if (target) {
        observer.observe(target, { childList: true, subtree: true, characterData: true });
      }
    } catch (e) {
      console.warn("DSA Tracker MutationObserver error:", e);
    }
  },

  addManualCaptureButton(extractor) {
    if (document.getElementById("dsa-tracker-capture-btn")) return;

    const button = document.createElement("button");
    button.id = "dsa-tracker-capture-btn";
    button.type = "button";
    button.textContent = "Track DSA 🛠️";
    button.title = "Click to push solution | Drag to move anywhere";
    button.style.position = "fixed";
    button.style.right = "20px";
    button.style.top = "35%";
    button.style.zIndex = "2147483647";
    button.style.padding = "9px 14px";
    button.style.border = "0";
    button.style.borderRadius = "20px";
    button.style.background = "linear-gradient(135deg, #0f766e, #0d9488)";
    button.style.color = "#ffffff";
    button.style.font = "600 12.5px system-ui, sans-serif";
    button.style.cursor = "grab";
    button.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
    button.style.userSelect = "none";

    // Restore user's saved drag position
    try {
      chrome.storage.local.get("btnPosition", (res) => {
        if (res && res.btnPosition) {
          button.style.left = res.btnPosition.left;
          button.style.top = res.btnPosition.top;
          button.style.right = "auto";
          button.style.bottom = "auto";
        }
      });
    } catch (e) {}

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    button.addEventListener("mousedown", (e) => {
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = button.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      button.style.cursor = "grabbing";

      const onMouseMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          isDragging = true;
          button.style.left = `${initialLeft + dx}px`;
          button.style.top = `${initialTop + dy}px`;
          button.style.right = "auto";
          button.style.bottom = "auto";
        }
      };

      const onMouseUp = () => {
        button.style.cursor = "grab";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);

        if (isDragging) {
          try {
            chrome.storage.local.set({
              btnPosition: { left: button.style.left, top: button.style.top }
            });
          } catch (e) {}
        }
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    button.addEventListener("click", (e) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.captureAndSend(extractor, true);
    });

    const parent = document.body || document.documentElement;
    if (parent) {
      parent.appendChild(button);
    }
  },

  initPlatform(extractor) {
    console.log(`DSA Tracker: initPlatform called for ${extractor.platform}`);

    const submitTracker = this.listenForSubmitClicks();

    window.DSATrackerCapture = () => this.captureAndSend(extractor, true);

    const attachButton = () => {
      if (!document.getElementById("dsa-tracker-capture-btn")) {
        this.addManualCaptureButton(extractor);
      }
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", attachButton);
    } else {
      attachButton();
    }

    // Keep button attached even if CodeChef / LeetCode React SPA re-renders the DOM
    setInterval(attachButton, 1500);

    let hasPushedThisSubmit = false;

    this.waitForAccepted(
      () => extractor.isAccepted(),
      () => {
        if (submitTracker.wasSubmittedRecently()) {
          if (!hasPushedThisSubmit) {
            hasPushedThisSubmit = true;
            submitTracker.markPushed();
            console.log("DSA Tracker: user submitted & solution accepted! Pushing...");
            this.captureAndSend(extractor, false);
            // Reset after 10s to allow future submissions of different problems
            setTimeout(() => { hasPushedThisSubmit = false; }, 10000);
          }
        } else {
          // Page load or old result present without active submit click
        }
      }
    );
  }
};

window.initPlatform = (extractor) => window.DSATrackerBase.initPlatform(extractor);
