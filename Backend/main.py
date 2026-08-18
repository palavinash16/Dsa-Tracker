from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

from auth import router as auth_router
from platform_classifier import get_primary_category, normalize_difficulty
from file_manager import (
    build_problem_file_payloads,
    create_problem_files,
    generate_repository_readme,
    update_repository_readme,
)
from github_service import upsert_files
from git_helper import git_add_commit_push
from tracker import is_duplicate, add_problem_entry, get_problem_entries, get_tracker_stats

app = FastAPI(title="Open Source DSA Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


class ProblemSubmission(BaseModel):
    title: str
    url: str
    difficulty: str
    tags: List[str]
    language: str
    code: str
    platform: str
    repo_root: str
    slug: str | None = None
    update_existing: bool = False


class GitHubProblemSubmission(BaseModel):
    title: str
    url: str
    difficulty: str
    tags: List[str]
    language: str
    code: str
    platform: str
    repo_full_name: str
    access_token: str
    slug: str | None = None
    branch: str | None = None
    update_existing: bool = False


def looks_like_problem_example(code: str) -> bool:
    normalized = code.strip().lower()
    return (
        normalized.startswith("input:")
        or "\noutput:" in normalized
        or "\nexplanation:" in normalized
    )


def entries_for_repository(entries: list[dict], repo_root: str, platform: str) -> list[dict]:
    matching = [
        entry for entry in entries
        if entry.get("status") == "pushed"
        and (
            entry.get("repo_root") == repo_root
            or (not entry.get("repo_root") and entry.get("platform") == platform)
        )
    ]
    return matching


def entries_for_github_repository(entries: list[dict], repo_full_name: str, platform: str) -> list[dict]:
    return [
        entry for entry in entries
        if entry.get("status") == "pushed"
        and (
            entry.get("repo_full_name") == repo_full_name
            or (not entry.get("repo_full_name") and entry.get("platform") == platform)
        )
    ]


@app.get("/")
def root():
    return {"message": "Open Source DSA Tracker backend is running"}


@app.get("/stats")
def stats():
    return get_tracker_stats()


@app.post("/submit-problem")
def submit_problem(problem: ProblemSubmission):
    if not problem.title.strip():
        raise HTTPException(status_code=400, detail="Problem title is required")

    if not problem.code.strip():
        raise HTTPException(status_code=400, detail="Submitted code is empty")

    if looks_like_problem_example(problem.code):
        raise HTTPException(
            status_code=400,
            detail="Submitted content looks like a problem example, not solution code."
        )

    if is_duplicate(problem.url, problem.platform, problem.language, problem.title) and not problem.update_existing:
        return {
            "success": False,
            "message": "Duplicate problem detected. Upload skipped.",
            "duplicate": True,
            "url": problem.url,
            "platform": problem.platform,
            "language": problem.language,
        }

    category = get_primary_category(
        tags=problem.tags,
        title=problem.title,
        repo_root=problem.repo_root,
    )
    difficulty = normalize_difficulty(problem.difficulty)

    created_files = create_problem_files(
        repo_root=problem.repo_root,
        category=category,
        difficulty=difficulty,
        title=problem.title,
        language=problem.language,
        code=problem.code,
        url=problem.url,
        platform=problem.platform,
        tags=problem.tags,
    )

    readme_entries = entries_for_repository(
        entries=get_problem_entries(),
        repo_root=problem.repo_root,
        platform=problem.platform,
    )
    readme_entries.append({
        "title": problem.title,
        "url": problem.url,
        "platform": problem.platform,
        "language": problem.language,
        "category": category,
        "difficulty": difficulty,
        "status": "pending",
    })
    repository_readme_path = update_repository_readme(problem.repo_root, readme_entries)

    commit_message = f"Added {problem.title} - {category} - {difficulty}"
    files_to_commit = [
        created_files["solution_path"],
        created_files["readme_path"],
        created_files["description_path"],
        repository_readme_path,
    ]

    git_result = git_add_commit_push(
        repo_path=problem.repo_root,
        commit_message=commit_message,
        paths=files_to_commit,
    )

    if git_result.get("success"):
        add_problem_entry(
            title=problem.title,
            url=problem.url,
            platform=problem.platform,
            language=problem.language,
            category=category,
            difficulty=difficulty,
            status="pushed",
            repo_root=problem.repo_root,
        )
    else:
        add_problem_entry(
            title=problem.title,
            url=problem.url,
            platform=problem.platform,
            language=problem.language,
            category=category,
            difficulty=difficulty,
            status="failed",
            repo_root=problem.repo_root,
        )

    return {
        "success": git_result.get("success", False),
        "message": "Problem processed",
        "duplicate": False,
        "category": category,
        "files": {
            **created_files,
            "repository_readme_path": repository_readme_path,
        },
        "git": git_result,
    }


@app.post("/submit-problem-github")
def submit_problem_github(problem: GitHubProblemSubmission):
    if not problem.title.strip():
        raise HTTPException(status_code=400, detail="Problem title is required")

    if not problem.code.strip():
        raise HTTPException(status_code=400, detail="Submitted code is empty")

    if looks_like_problem_example(problem.code):
        raise HTTPException(
            status_code=400,
            detail="Submitted content looks like a problem example, not solution code."
        )

    if is_duplicate(problem.url, problem.platform, problem.language, problem.title) and not problem.update_existing:
        return {
            "success": False,
            "message": "Duplicate problem detected. Upload skipped.",
            "duplicate": True,
            "url": problem.url,
            "platform": problem.platform,
            "language": problem.language,
        }

    category = get_primary_category(tags=problem.tags, title=problem.title)
    difficulty = normalize_difficulty(problem.difficulty)

    files = build_problem_file_payloads(
        category=category,
        difficulty=difficulty,
        title=problem.title,
        language=problem.language,
        code=problem.code,
        url=problem.url,
        platform=problem.platform,
        tags=problem.tags,
    )

    readme_entries = entries_for_github_repository(
        entries=get_problem_entries(),
        repo_full_name=problem.repo_full_name,
        platform=problem.platform,
    )
    readme_entries.append({
        "title": problem.title,
        "url": problem.url,
        "platform": problem.platform,
        "language": problem.language,
        "category": category,
        "difficulty": difficulty,
        "status": "pending",
    })
    files["README.md"] = generate_repository_readme(readme_entries)

    commit_message = f"Added {problem.title} - {category} - {difficulty}"

    try:
        github_result = upsert_files(
            access_token=problem.access_token,
            repo_full_name=problem.repo_full_name,
            files=files,
            message=commit_message,
            branch=problem.branch,
        )
    except Exception as exc:
        add_problem_entry(
            title=problem.title,
            url=problem.url,
            platform=problem.platform,
            language=problem.language,
            category=category,
            difficulty=difficulty,
            status="failed",
            repo_full_name=problem.repo_full_name,
        )
        raise HTTPException(status_code=400, detail=f"GitHub upload failed: {exc}")

    add_problem_entry(
        title=problem.title,
        url=problem.url,
        platform=problem.platform,
        language=problem.language,
        category=category,
        difficulty=difficulty,
        status="pushed",
        repo_full_name=problem.repo_full_name,
    )

    return {
        "success": True,
        "message": "Problem uploaded with GitHub API",
        "duplicate": False,
        "category": category,
        "difficulty": difficulty,
        "github": github_result,
    }
