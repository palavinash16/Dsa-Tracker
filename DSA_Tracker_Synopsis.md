# Synopsis

## **DSA Tracker: An Automated Browser-Based System for Multi-Platform Data Structures and Algorithms Progress Tracking and Repository Synchronization**

**Report submitted in partial fulfillment of the requirement for the degree of**

### **B.Tech.**
### **In**
### **COMPUTER SCIENCE AND ENGINEERING**

**Under the Supervision of**  
`[Supervisor Name]`  
`[Designation]`  
  
**By**  
`[Student Name 1]` (`[Roll Number 1]`)  
`[Student Name 2]` (`[Roll Number 2]`)  
`[Student Name 3]` (`[Roll Number 3]`)  
`[Student Name 4]` (`[Roll Number 4]`)  

**`[Department of Computer Science and Engineering]`**  
**`[College / Institute Name, Location]`**  
**`[Affiliated University Name]`**  

**2025–2026**

---

## **TABLE OF CONTENTS**

| S. NO. | TOPICS | PAGE NO. |
| :---: | :--- | :---: |
| 1 | OBJECTIVE AND SUBOBJECTIVE | 3 |
| 2 | ABSTRACT | 3-4 |
| 3 | INTRODUCTION | 4-5 |
| 4 | LITERATURE REVIEW | 5-6 |
| 5 | METHODOLOGY | 6-7 |
| 6 | RESOURCES [H/W, S/W] | 7-8 |
| 7 | PROJECT PLANNING (SCHEDULING) | 8-9 |
| 8 | REFERENCES | 9-10 |

---

## **1. OBJECTIVE AND SUBOBJECTIVE**

The objective of this project is to design and implement an automated, client-side tracking and synchronization system—**DSA Tracker**—that monitors, organizes, and analyzes problem-solving progress across multiple competitive programming and coding platforms using Chrome Extension Manifest V3 architecture and GitHub REST API integration. The main goals are:

1. **To capture accepted problem submissions automatically** from popular online coding platforms including LeetCode, GeeksforGeeks (GFG), CodeChef, Codeforces, and HackerRank without requiring manual user intervention.
2. **To extract relevant problem metadata**, such as problem title, difficulty level, topic tags, programming language, source URL, and exact solution source code directly from browser DOM elements.
3. **To classify problems automatically by topic category** (such as Arrays, Dynamic Programming, Graphs, Trees, Strings) and difficulty level using client-side parsing rules.
4. **To organize and push solution files directly to a personal GitHub repository** using fine-grained Personal Access Token (PAT) authentication via the GitHub REST API.
5. **To maintain a structured repository layout** (`DSA/<Category>/<Difficulty>/<Slug>/`) containing the solution code file, a formatted `problem.md` file, and an auto-updating root `README.md` index table.
6. **To record and update problem-solving stats locally** within browser storage (`chrome.storage.local`) to ensure user privacy and fast retrieval without relying on an external database server.
7. **To track daily solving streaks** and issue reminder notifications using background alarm listeners (`chrome.alarms`) to encourage consistent practice.
8. **To provide an interactive analytical dashboard** built with custom HTML/CSS and Chart.js, rendering statistics on difficulty distribution, platform breakdown, category progress, and recent submission history.

---

## **2. ABSTRACT**

Data Structures and Algorithms (DSA) form the foundation of computer science education and technical interview preparation. Students and programmers regularly practice coding problems across multiple online platforms such as LeetCode, GeeksforGeeks, CodeChef, Codeforces, and HackerRank. However, keeping track of solved problems, solutions, and topic-wise progress across these fragmented platforms is a major challenge. Manual record-keeping in spreadsheets or local directories is tedious, inconsistent, and prone to data loss, while platform-native profiles only provide isolated, platform-specific statistics.

To address these challenges, **DSA Tracker** is developed as a lightweight, browser-based extension operating on Google Chrome's Manifest V3 architecture. The system automatically detects when a user successfully submits a solution on a supported coding platform, extracts the solution code along with metadata (difficulty, tags, language, and problem statement), and classifies the problem into a standard algorithmic topic. Using client-side GitHub REST API integration, DSA Tracker commits the code and generated markdown documentation directly to a user-designated GitHub repository, organizing files systematically into structured directories and maintaining an updated main index README.

In addition to automated repository synchronization, DSA Tracker includes a local analytical dashboard that operates directly within the browser using `chrome.storage.local`. The dashboard uses Chart.js to visualize difficulty distribution, platform-wise performance, category progress, and recent submission logs. It also tracks daily solving streaks and triggers notifications via `chrome.alarms` to encourage regular practice. By eliminating backend server overhead and manual tracking effort, DSA Tracker provides a secure, efficient, and centralized solution for students to manage their DSA preparation and build a verifiable portfolio of solved problems.

---

## **3. INTRODUCTION**

Data Structures and Algorithms (DSA) are critical components of software engineering education, competitive programming, and technical hiring assessments. Mastering DSA requires continuous practice, problem analysis, and periodic revision. Today, students rely on various dedicated platforms—such as LeetCode, GeeksforGeeks, CodeChef, Codeforces, and HackerRank—to solve algorithmic challenges.

Despite the abundance of learning platforms, students face a significant organizational problem. Solved problems, code implementations, and notes remain scattered across different web portals, local files, and personal drives. This fragmentation leads to several operational difficulties:
* Students struggle to remember which problems they solved on which platform.
* Revising previously solved problems requires navigating back to individual website submissions.
* Identifying weak topics (such as Dynamic Programming or Graphs) is difficult due to the lack of unified progress analytics across platforms.
* Maintaining a portfolio of solved problems on GitHub requires manual copy-pasting, which is time-consuming and often abandoned over time.

**DSA Tracker** is designed as a practical, automated solution to centralize DSA preparation. Built as a Google Chrome extension (Manifest V3), it operates unobtrusively in the browser. Whenever a user solves a problem on any of the five supported platforms, DSA Tracker automatically captures the submission, categorizes the problem by topic and difficulty, and pushes the solution along with structured documentation to the user's GitHub repository.

Furthermore, DSA Tracker stores submission records locally in browser storage and presents them through an interactive in-extension dashboard. The dashboard offers visual statistics, search and filter features, and streak tracking to help users maintain consistency.

### **Key Highlights of DSA Tracker:**
➢ **Multi-Platform Solution Extraction:** Automatically detects accepted submissions on LeetCode, GeeksforGeeks, CodeChef, Codeforces, and HackerRank.  
➢ **Automated Repository Sync:** Pushes code, problem statements, and metadata directly to GitHub via the REST API without an intermediate server.  
➢ **Structured Directory Organization:** Groups solutions systematically into `DSA/<Category>/<Difficulty>/<Slug>/` paths and updates a central repository index table.  
➢ **Local Analytics Dashboard:** Displays difficulty ratios, platform distribution, topic-wise progress bars, and recent activity using Chart.js.  
➢ **Streak Tracking & Notifications:** Calculates daily solving streaks using `chrome.alarms` and delivers browser reminder alerts.  
➢ **Privacy & Lightweight Design:** Eliminates external server dependencies by storing configuration tokens and statistics securely in `chrome.storage.local`.

---

## **4. LITERATURE REVIEW**

Current practices and tools used by students to manage their DSA problem-solving progress generally fall into four categories:

1. **Manual Code Archiving:** Students manually copy solved code from online editors and paste it into local text files or personal GitHub repositories. While straightforward, this process is repetitive, relies entirely on human discipline, and is often discontinued.
2. **Platform-Native Profiles:** Each coding website maintains a user profile with submission records. However, these statistics are siloed within each platform, making it impossible to get a consolidated view of overall DSA progress across multiple websites.
3. **Spreadsheets and Custom Notes:** Students often use tools like Microsoft Excel, Google Sheets, or Notion to log problem titles, links, and dates. This approach requires manual data entry for every problem solved, lacks code backup, and cannot verify submission correctness automatically.
4. **Single-Platform Browser Extensions:** Browser tools such as LeetHub automate code pushes for LeetCode. However, they lack support for other major platforms (such as GeeksforGeeks, CodeChef, Codeforces, and HackerRank), do not offer topic classification, and lack integrated analytics dashboards.

### **Detailed Review of Related Approaches and Systems:**

**Manual Spreadsheet and Template Systems (Common Academic Practice):**  
In typical college environments, students maintain manual logbooks or spreadsheets (such as Striver's SDE Sheet trackers) to check off solved problems. While these sheets provide structured topic lists, they require continuous manual updates. They fail to archive actual solution code or execution statistics, leaving students without a centralized codebase for revision [1].

**Platform-Specific Dashboard Tracking (LeetCode / CodeChef Profiles):**  
Platform profiles summarize solved count, acceptance rate, and contest ratings. However, these metrics remain restricted to their respective ecosystems. A student active on both LeetCode and Codeforces must check two separate portals, hindering a unified evaluation of algorithmic strengths and weaknesses [2].

**Single-Platform GitHub Synchronization Tools (e.g., LeetHub v1/v2):**  
Tools like LeetHub demonstrated the viability of browser extensions auto-syncing LeetCode solutions to GitHub repositories via the GitHub API. However, analysis of such tools reveals three primary limitations:
* They are hardcoded for a single platform (LeetCode) and ignore major competitive programming sites like Codeforces or CodeChef.
* They save files in flat or basic folder layouts without multi-level categorization by algorithmic topic (e.g., Dynamic Programming vs. Graphs).
* They lack local analytics tools, streak monitoring, or offline progress dashboards [3].

---

## **5. METHODOLOGY**

DSA Tracker adopts a modular client-side architecture operating within Google Chrome (Manifest V3). The workflow covers content scraping, topic classification, GitHub REST API synchronization, local storage logging, and analytics rendering.

### **Stepwise Workflow:**

1. **Platform Script Injection & DOM Monitoring:**  
   Content scripts (`leetcode.js`, `gfg.js`, `codechef.js`, `codeforces.js`, `hackerrank.js`) extending a base platform scraper (`base.js`) run in the background on supported coding websites. They monitor DOM elements for successful submission indicators (e.g., "Accepted" status tags or success containers).

2. **Metadata & Solution Extraction:**  
   Upon detecting an accepted submission, the content script extracts the problem title, problem slug, difficulty rating (Easy, Medium, Hard), topic tags, programming language extension, source code string, and problem URL.

3. **Topic & Difficulty Classification:**  
   The background service worker (`background.js` and `github.js`) processes the extracted tags and title keywords through a keyword-matching classifier. It maps the problem to standard DSA categories such as Arrays, Strings, Dynamic Programming, Graphs, Trees, Greedy, or Math.

4. **Directory Structure & Markdown File Generation:**  
   The system builds a structured folder path (`DSA/<Category>/<Difficulty>/<Slug>/`) and prepares three repository components:
   * Solution source file (e.g., `solution.cpp`, `solution.py`, `solution.java`).
   * A detailed `problem.md` containing the problem title, difficulty, topic tags, link, and formatted problem description.
   * An updated root `README.md` containing an indexed markdown table of all solved problems.

5. **Direct GitHub API Synchronization:**  
   Using the stored GitHub Personal Access Token (PAT), `github.js` performs authenticated REST API calls (`https://api.github.com/repos/{owner}/{repo}/contents/{path}`) to create or update files directly in the user's target repository under a single commit message.

6. **Local Storage & Streak Calculation:**  
   After a successful push, the submission record is appended to `stats.solved` inside `chrome.storage.local`. The system updates the daily solving streak counter and displays a success notification toast. Daily background alarm checks (`chrome.alarms`) issue reminders if no problem has been solved on a given day.

7. **Dashboard Rendering & Visualization:**  
   When the user opens `dashboard.html`, `dashboard.js` reads stored submission records from `chrome.storage.local`. It uses Chart.js (`vendor/chart.umd.min.js`) to render charts for difficulty breakdown, platform breakdown, topic coverage, and recent submission logs with live search/filtering capabilities.

---

### **System Architecture & Dataflow:**

```
+-------------------------------------------------------------------+
|                     User Solves Problem                           |
|        (LeetCode / GFG / CodeChef / Codeforces / HackerRank)      |
+-------------------------------------------------------------------+
                                 |
                                 v
+-------------------------------------------------------------------+
|               Content Script (DOM Scraping)                       |
|   - Detects "Accepted" status                                     |
|   - Extracts Code, Metadata, Difficulty, Tags, Language           |
+-------------------------------------------------------------------+
                                 |
                                 v
+-------------------------------------------------------------------+
|            Background Service Worker (background.js)              |
|   - Classifies Category (Arrays, DP, Graphs, Trees, etc.)         |
|   - Constructs Path: DSA/<Category>/<Difficulty>/<Slug>/          |
+-------------------------------------------------------------------+
                                 |
        +------------------------+------------------------+
        |                                                 |
        v                                                 v
+----------------------------------+   +----------------------------------+
|     GitHub REST API Push         |   |     Local Chrome Storage         |
|   - Pushes solution code file    |   |   - Saves submission record      |
|   - Pushes problem.md            |   |   - Updates streak counter       |
|   - Updates root README.md index |   |   - Triggers streak alarms       |
+----------------------------------+   +----------------------------------+
                                                          |
                                                          v
                                       +----------------------------------+
                                       |    In-Extension Dashboard         |
                                       |   - Difficulty / Platform Charts |
                                       |   - Topic Progress Bars          |
                                       |   - Recent Submissions Log       |
                                       +----------------------------------+
```

---

## **6. RESOURCES [H/W, S/W]**

### **HARDWARE REQUIREMENTS**
* **Processor:** Intel Core i3 / AMD Ryzen 3 or higher.
* **RAM:** 4 GB minimum (8 GB recommended for multi-tab browser usage).
* **Storage Space:** 100 MB of free storage space for browser installation and local extension files.
* **Display:** Standard resolution display (1366x768 or higher).

### **SOFTWARE REQUIREMENTS**
* **Operating System:** Windows 10/11, macOS, or Linux.
* **Web Browser:** Google Chrome, Microsoft Edge, Brave, or any Chromium-based browser supporting Manifest V3 extension standards.
* **Core Web Stack:** HTML5, CSS3, JavaScript (ES6+ standard).
* **Browser Extension Framework:** Chrome Extension Manifest V3 APIs (`chrome.storage.local`, `chrome.alarms`, `chrome.notifications`, `chrome.scripting`, `chrome.runtime`).
* **External API Integration:** GitHub REST API v3 (for automated repository management and file commits via fine-grained Personal Access Tokens).
* **Visualization Libraries:** Chart.js (v4, bundled locally via `vendor/chart.umd.min.js`).
* **Development Tools:** Visual Studio Code (IDE), Git for source management, Chrome Extension Developer Mode for testing.

### **OTHER REQUIREMENTS**
* **GitHub Account:** Active GitHub account with a fine-grained or classic Personal Access Token (PAT) configured with contents read/write permissions.
* **Internet Connectivity:** Active internet connection for communicating with platform websites and making API calls to GitHub.

---

## **7. PROJECT PLANNING (SCHEDULING)**

The project development is organized into six sequential phases over an estimated timeline of 13 weeks:

| Phase | Tasks | Duration |
| :---: | :--- | :---: |
| **Phase 1** | Requirement Analysis & Platform DOM Investigation | 2 Weeks |
| **Phase 2** | Content Script Scraping Engine Development (LeetCode, GFG, CodeChef, Codeforces, HackerRank) | 3 Weeks |
| **Phase 3** | Client-Side GitHub REST API Layer & Directory Classifier Implementation | 2 Weeks |
| **Phase 4** | Local Storage Management, Streak Tracking & Notification Alarms Setup | 2 Weeks |
| **Phase 5** | Analytics Dashboard & Visual UI Components (Chart.js Integration) | 2 Weeks |
| **Phase 6** | End-to-End System Testing, Bug Fixes & Project Documentation | 2 Weeks |

**Total Duration:** 13 Weeks (Approx.)

---

## **8. REFERENCES**

1. S. L. Harris and D. Money Harris, *Digital Design and Computer Architecture*, 2nd ed. Morgan Kaufmann, 2012, pp. 215–230.
2. W. Chrome Developer Documentation, "Migrating to Extension Manifest V3," Google Developers, 2023. [Online]. Available: https://developer.chrome.com/docs/extensions/mv3/intro/
3. GitHub Developer Documentation, "REST API endpoints for repository contents," GitHub Docs, 2023. [Online]. Available: https://docs.github.com/en/rest/repos/contents
4. M. Haverbeke, *Eloquent JavaScript: A Modern Introduction to Programming*, 3rd ed. No Starch Press, 2018.
5. Chart.js Documentation, "Chart.js: Open source HTML5 Charts for most popular chart types," 2023. [Online]. Available: https://www.chartjs.org/docs/latest/
6. E. Gamma, R. Helm, R. Johnson, and J. Vlissides, *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994.
7. MDN Web Docs, "Using the Fetch API," Mozilla Developer Network, 2023. [Online]. Available: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
8. T. H. Cormen, C. E. Leiserson, R. L. Rivest, and C. Stein, *Introduction to Algorithms*, 3rd ed. MIT Press, 2009.
9. W3C Recommendation, "Web Storage API Specification," World Wide Web Consortium, 2021. [Online]. Available: https://www.w3.org/TR/webstorage/
10. E. B. Bausor and A. R. L. V. Wright, "Automated assessment systems in computer science education," *ACM Inroads*, vol. 11, no. 2, pp. 45–52, 2020.
