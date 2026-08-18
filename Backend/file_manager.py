import re
from pathlib import Path


LANGUAGE_EXTENSIONS = {
    "python": "py",
    "cpp": "cpp",
    "c++": "cpp",
    "java": "java",
    "javascript": "js",
    "typescript": "ts",
    "c": "c",
    "csharp": "cs",
    "go": "go",
    "rust": "rs",
    "kotlin": "kt",
    "swift": "swift",
}


def sanitize_name(name: str) -> str:
    name = name.strip()
    name = re.sub(r"[^\w\s-]", "", name)
    name = re.sub(r"\s+", "_", name)
    return name


def get_file_extension(language: str) -> str:
    return LANGUAGE_EXTENSIONS.get(language.lower(), "txt")


def normalize_code(code: str) -> str:
    return (
        code
        .replace("\u00a0", " ")
        .replace("\u00c2", "")
        .replace("\r\n", "\n")
        .replace("\r", "\n")
        .rstrip()
        + "\n"
    )


def generate_readme(title: str, url: str, platform: str, difficulty: str, tags: list[str], language: str) -> str:
    tags_text = ", ".join(tags) if tags else "Not specified"

    return f"""# {title}

## Problem Link
{url}

## Platform
{platform}

## Difficulty
{difficulty}

## Tags
{tags_text}

## Language
{language}

## Approach
This problem was automatically organized into the correct category folder based on its detected tags.
You can later update this section with a detailed beginner-friendly explanation.

## Complexity
- Time Complexity: Add manually
- Space Complexity: Add manually
"""


def generate_problem_description(title: str, url: str, platform: str) -> str:
    return f"""# Problem Description

**Title:** {title}
**Platform:** {platform}
**URL:** {url}

Add a short summary of the problem here.
For public repositories, prefer adding a concise overview and the original problem link instead of copying the full statement.
"""


def problem_row(problem: dict) -> str:
    title = problem.get("title", "Untitled")
    url = problem.get("url", "")
    platform = problem.get("platform", "Unknown")
    category = problem.get("category", "Uncategorized")
    difficulty = problem.get("difficulty", "Unknown")
    language = problem.get("language", "Unknown")
    status = problem.get("status", "pending")
    title_cell = f"[{title}]({url})" if url else title

    return f"| {title_cell} | {platform} | {category} | {difficulty} | {language} | {status} |"


def generate_repository_readme(entries: list[dict]) -> str:
    pushed = [entry for entry in entries if entry.get("status") == "pushed"]
    pending = [entry for entry in entries if entry.get("status") != "pushed"]
    total = len(entries)

    rows = "\n".join(problem_row(entry) for entry in entries) or "| No problems yet | - | - | - | - | - |"

    return f"""# DSA Solutions

Automatically organized DSA solutions captured by DSA Tracker.

## Stats
- Total problems tracked: {total}
- Successfully pushed: {len(pushed)}
- Pending or failed push: {len(pending)}

## Folder Structure
```text
DSA/
  Category/
    Difficulty/
      Problem_Name/
        solution.<language>
        README.md
        problem.md
```

## Problems
| Problem | Platform | Category | Difficulty | Language | Status |
| --- | --- | --- | --- | --- | --- |
{rows}
"""


def update_repository_readme(repo_root: str, entries: list[dict]) -> str:
    readme_path = Path(repo_root) / "README.md"
    readme_path.write_text(generate_repository_readme(entries), encoding="utf-8")
    return str(readme_path)


def create_problem_files(
    repo_root: str,
    category: str,
    difficulty: str,
    title: str,
    language: str,
    code: str,
    url: str,
    platform: str,
    tags: list[str],
) -> dict:
    safe_title = sanitize_name(title)
    ext = get_file_extension(language)

    problem_dir = Path(repo_root) / "DSA" / category / difficulty / safe_title
    problem_dir.mkdir(parents=True, exist_ok=True)

    solution_path = problem_dir / f"solution.{ext}"
    readme_path = problem_dir / "README.md"
    description_path = problem_dir / "problem.md"

    with open(solution_path, "w", encoding="utf-8") as f:
        f.write(normalize_code(code))

    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(generate_readme(title, url, platform, difficulty, tags, language))

    with open(description_path, "w", encoding="utf-8") as f:
        f.write(generate_problem_description(title, url, platform))

    return {
        "problem_dir": str(problem_dir),
        "solution_path": str(solution_path),
        "readme_path": str(readme_path),
        "description_path": str(description_path),
    }


def build_problem_file_payloads(
    category: str,
    difficulty: str,
    title: str,
    language: str,
    code: str,
    url: str,
    platform: str,
    tags: list[str],
) -> dict[str, str]:
    safe_title = sanitize_name(title)
    ext = get_file_extension(language)
    base_path = f"DSA/{category}/{difficulty}/{safe_title}"

    return {
        f"{base_path}/solution.{ext}": normalize_code(code),
        f"{base_path}/README.md": generate_readme(title, url, platform, difficulty, tags, language),
        f"{base_path}/problem.md": generate_problem_description(title, url, platform),
    }

