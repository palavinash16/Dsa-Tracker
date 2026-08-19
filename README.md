# 🚀 DSA Tracker: Automated Browser-Based Multi-Platform Problem Tracker & GitHub Synchronizer

![Chrome Extension Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)
![JavaScript ES6+](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![Python Backend](https://img.shields.io/badge/Python-FastAPI-green.svg)
![GitHub API v3](https://img.shields.io/badge/GitHub%20API-v3-black.svg)
![License](https://img.shields.io/badge/License-MIT-purple.svg)

**DSA Tracker** is a lightweight, privacy-focused Google Chrome extension (Manifest V3) and backend service designed to automate Data Structures and Algorithms (DSA) problem tracking. Whenever you successfully solve a problem on **LeetCode, GeeksforGeeks, CodeChef, Codeforces, or HackerRank**, DSA Tracker automatically captures your solution, categorizes it by algorithmic topic and difficulty, and commits the code and structured documentation directly to your GitHub repository.

---

## 🔥 Key Features

- ⚡ **Multi-Platform Automated Solution Scraping**: Seamlessly extracts accepted submissions, source code, language, problem tags, difficulty level, and problem URLs across 5 major coding portals.
- 📁 **Automated GitHub Synchronization**: Uses client-side GitHub REST API integration (via Personal Access Token) to push solution code, formatted `problem.md` notes, and an auto-updating root `README.md` index table under `DSA/<Category>/<Difficulty>/<Slug>/`.
- 📊 **In-Extension Analytics Dashboard**: Interactive dashboard powered by **Chart.js** (`vendor/chart.umd.min.js`) rendering difficulty distribution ratios, platform-wise breakdowns, topic progress bars, and recent submission logs with live filtering.
- 🔥 **Daily Streak Tracking & Alarms**: Calculates daily practice streaks and sends browser reminders via `chrome.alarms` and notification toasts to maintain consistency.
- 🔒 **Privacy-First & Zero-Backend Option**: Operates fully client-side inside the browser using `chrome.storage.local` without storing credentials on third-party cloud servers.
- 🐍 **Optional Python Backend Service**: Includes a FastAPI service (`main.py`) for server-side repository management, git helpers, and automated classification tests.

---

## 🌐 Supported Coding Platforms

| Platform | Domain | Submission Detection Method | Metadata Extracted |
| :--- | :--- | :--- | :--- |
| **LeetCode** | `leetcode.com` | Submission state DOM listener | Code, Title, Difficulty, Tags, Language |
| **GeeksforGeeks** | `geeksforgeeks.org` | Result container DOM parsing | Code, Title, Difficulty, Tags, Language |
| **CodeChef** | `codechef.com` | Status element observer | Code, Title, Difficulty, Tags, Language |
| **Codeforces** | `codeforces.com` | Verdict element scanner | Code, Title, Difficulty, Tags, Language |
| **HackerRank** | `hackerrank.com` | Testcase container observer | Code, Title, Difficulty, Tags, Language |

---

## 🏗️ Repository Folder Layout

When DSA Tracker syncs your solutions to GitHub, it structures them systematically:

```text
DSA/
├── Arrays/
│   ├── Easy/
│   │   └── two-sum/
│   │       ├── solution.cpp
│   │       └── problem.md
│   └── Medium/
│       └── 3sum/
│           ├── solution.py
│           └── problem.md
├── Dynamic-Programming/
│   └── Hard/
│       └── climbing-stairs/
│           ├── solution.java
│           └── problem.md
└── README.md   <-- Auto-updated central index table of all solved problems
```

---

## 🛠️ Technology Stack

### **Browser Extension**
- **Architecture**: Chrome Extension Manifest V3 (MV3)
- **Languages**: JavaScript (ES6+), HTML5, Vanilla CSS3 (Glassmorphic Dark Theme)
- **Chrome APIs**: `chrome.storage.local`, `chrome.alarms`, `chrome.notifications`, `chrome.runtime`, `chrome.scripting`
- **Visualization**: Chart.js v4 (bundled locally)
- **API Integration**: GitHub REST API v3

### **Backend (Optional Microservice)**
- **Framework**: FastAPI (Python 3)
- **Server**: Uvicorn ASGI
- **Validation**: Pydantic
- **Testing**: Pytest, Pytest-Asyncio
- **HTTP Client**: HTTPX, Requests

---

## 🚀 Installation & Setup Guide

### **1. Install Chrome Extension**
1. Clone or download this repository:
   ```bash
   git clone https://github.com/palavinash16/Dsa-Tracker.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the `chrome-extension/` directory from this project.
5. Click the extension icon in Chrome toolbar to open settings.
6. Enter your **GitHub Personal Access Token (PAT)** (with `repo` contents read/write scope) and your target repository name.
7. Click **Connect & Save**.

---

### **2. Running the Python Backend (Optional)**
If you wish to run the optional FastAPI microservice:
```bash
cd Backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

---

## 📊 Analytics Dashboard

Click **"Open Dashboard"** from the extension popup to view:
- **Total Solved Counter & Active Streak**
- **Difficulty Ratio Doughnut Chart** (Easy, Medium, Hard)
- **Platform Breakdown Bar Chart**
- **Topic Coverage Progress Bars**
- **Filterable Recent Submissions Table**

---

## 👤 Author

Developed by **Avinash Kumar Pal**  
GitHub: [@palavinash16](https://github.com/palavinash16)
