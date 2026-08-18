import json
import re
from datetime import date, datetime, timedelta
from pathlib import Path


TRACKER_FILE = Path(__file__).resolve().parent / "tracker.json"


def normalize_platform(platform: str) -> str:
    return (platform or "").strip().lower()


def problem_slug(url: str, title: str = "") -> str:
    patterns = [
        r"/problems/([^/?#]+)/?",
        r"/submit/([^/?#]+)/?",
        r"/viewsolution/([^/?#]+)/?",
        r"/problemset/problem/(\d+)/([A-Z]\d?)/?",
        r"/contest/(\d+)/problem/([A-Z]\d?)/?",
        r"/contest/(\d+)/submission/(\d+)/?",
    ]

    for pattern in patterns:
        match = re.search(pattern, url or "", re.IGNORECASE)
        if match:
            return "-".join(part.strip().lower() for part in match.groups())

    slug = re.sub(r"^\d+\.\s*", "", title or "").strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def problem_key(url: str, platform: str, language: str, title: str = "") -> str:
    return "::".join([
        normalize_platform(platform),
        problem_slug(url, title),
        (language or "").strip().lower(),
    ])


def load_tracker() -> dict:
    if not TRACKER_FILE.exists():
        return {"solved": []}

    with open(TRACKER_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_tracker(data: dict) -> None:
    with open(TRACKER_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def find_problem(url: str, platform: str, language: str, title: str = "") -> dict | None:
    data = load_tracker()
    incoming_key = problem_key(url, platform, language, title)

    for problem in data.get("solved", []):
        existing_key = problem.get("problem_key") or problem_key(
            problem.get("url", ""),
            problem.get("platform", ""),
            problem.get("language", ""),
            problem.get("title", ""),
        )
        if existing_key == incoming_key:
            return problem

    return None


def is_duplicate(url: str, platform: str, language: str, title: str = "") -> bool:
    existing = find_problem(url, platform, language, title)

    if not existing:
        return False

    return existing.get("status") == "pushed"


def add_problem_entry(
    title: str,
    url: str,
    platform: str,
    language: str,
    category: str,
    difficulty: str,
    status: str,
    repo_root: str = "",
    repo_full_name: str = "",
) -> None:
    data = load_tracker()
    now = datetime.now().isoformat(timespec="seconds")
    today = date.today().isoformat()

    key = problem_key(url, platform, language, title)
    existing = find_problem(url, platform, language, title)

    if existing:
        existing["title"] = title
        existing["category"] = category
        existing["difficulty"] = difficulty
        existing["status"] = status
        existing["url"] = url
        existing["problem_key"] = key
        existing["repo_root"] = repo_root
        existing["repo_full_name"] = repo_full_name
        existing["updated_at"] = now
        if status == "pushed":
            existing["solved_at"] = existing.get("solved_at") or now
            existing["solved_date"] = existing.get("solved_date") or today
    else:
        entry = {
            "title": title,
            "url": url,
            "platform": platform,
            "language": language,
            "category": category,
            "difficulty": difficulty,
            "status": status,
            "problem_key": key,
            "repo_root": repo_root,
            "repo_full_name": repo_full_name,
            "created_at": now,
            "updated_at": now,
        }

        if status == "pushed":
            entry["solved_at"] = now
            entry["solved_date"] = today

        data["solved"].append(entry)

    save_tracker(data)


def get_problem_entries() -> list[dict]:
    return load_tracker().get("solved", [])


def _parse_solved_date(value: str) -> date | None:
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def calculate_streaks(solved_dates: set[date]) -> dict:
    if not solved_dates:
        return {"current_streak": 0, "longest_streak": 0}

    today = date.today()
    current = 0
    cursor = today

    while cursor in solved_dates:
        current += 1
        cursor -= timedelta(days=1)

    longest = 0
    run = 0
    previous = None

    for solved_date in sorted(solved_dates):
        if previous and solved_date == previous + timedelta(days=1):
            run += 1
        else:
            run = 1

        longest = max(longest, run)
        previous = solved_date

    return {"current_streak": current, "longest_streak": longest}


def get_tracker_stats() -> dict:
    data = load_tracker()
    solved = data.get("solved", [])
    pushed = [problem for problem in solved if problem.get("status") == "pushed"]
    failed = [problem for problem in solved if problem.get("status") == "failed"]

    solved_dates = {
        parsed
        for parsed in (_parse_solved_date(problem.get("solved_date")) for problem in pushed)
        if parsed
    }

    by_platform: dict[str, int] = {}
    by_category: dict[str, int] = {}
    by_difficulty: dict[str, int] = {}
    by_date: dict[str, int] = {}

    for problem in pushed:
        by_platform[problem.get("platform", "Unknown")] = by_platform.get(problem.get("platform", "Unknown"), 0) + 1
        by_category[problem.get("category", "Uncategorized")] = by_category.get(problem.get("category", "Uncategorized"), 0) + 1
        by_difficulty[problem.get("difficulty", "Unknown")] = by_difficulty.get(problem.get("difficulty", "Unknown"), 0) + 1

        solved_day = problem.get("solved_date")
        if solved_day:
            by_date[solved_day] = by_date.get(solved_day, 0) + 1

    return {
        "total_tracked": len(solved),
        "total_pushed": len(pushed),
        "total_failed": len(failed),
        "active_days": len(solved_dates),
        **calculate_streaks(solved_dates),
        "by_platform": by_platform,
        "by_category": by_category,
        "by_difficulty": by_difficulty,
        "by_date": by_date,
        "recent": list(reversed(solved[-10:])),
    }
