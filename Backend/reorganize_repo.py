import argparse
import re
import shutil
from pathlib import Path

from file_manager import sanitize_name
from platform_classifier import get_primary_category, normalize_difficulty


SOURCE_BUCKETS = [
    ("Uncategorized", "Unknown"),
    ("General", "Easy"),
]


def title_from_problem_dir(problem_dir: Path) -> str:
    for file_name in ("README.md", "problem.md"):
        path = problem_dir / file_name
        if not path.exists():
            continue

        text = path.read_text(encoding="utf-8", errors="ignore")
        title = title_from_gfg_url(text)
        if title:
            return title

        for line in text.splitlines():
            if line.startswith("# "):
                heading = line.removeprefix("# ").strip()
                if not re.search(r"soln|solution|using map|comment|article", heading, re.IGNORECASE):
                    return heading

    return problem_dir.name.replace("_", " ")


def title_from_gfg_url(text: str) -> str:
    match = re.search(r"geeksforgeeks\.org/problems/([^/\s)]+)", text, re.IGNORECASE)
    if not match:
        return ""

    slug = re.sub(r"-\d+$", "", match.group(1))
    slug = re.sub(r"\d+$", "", slug)

    return " ".join(word.capitalize() for word in slug.split("-") if word)


def planned_moves(repo_root: Path) -> list[tuple[Path, Path]]:
    moves = []
    dsa_root = repo_root / "DSA"

    for category, difficulty in SOURCE_BUCKETS:
        source_root = dsa_root / category / difficulty
        if not source_root.exists():
            continue

        for problem_dir in source_root.iterdir():
            if not problem_dir.is_dir():
                continue

            title = title_from_problem_dir(problem_dir)
            target_category = get_primary_category([], title, str(repo_root))
            target_difficulty = normalize_difficulty(difficulty)
            target_dir = dsa_root / target_category / target_difficulty / sanitize_name(title)

            if problem_dir.resolve() != target_dir.resolve():
                moves.append((problem_dir, target_dir))

    return moves


def apply_moves(moves: list[tuple[Path, Path]]) -> None:
    for source, target in moves:
        target.parent.mkdir(parents=True, exist_ok=True)

        if target.exists():
            print(f"SKIP existing target: {target}")
            continue

        shutil.move(str(source), str(target))
        print(f"MOVED {source} -> {target}")


def remove_empty_dirs(root: Path) -> None:
    for path in sorted(root.rglob("*"), key=lambda item: len(item.parts), reverse=True):
        if path.is_dir() and not any(path.iterdir()):
            path.rmdir()


def main() -> None:
    parser = argparse.ArgumentParser(description="Reorganize generated DSA folders into classified categories.")
    parser.add_argument("repo_root", help="Local repository root, for example C:/.../GFGRepo")
    parser.add_argument("--apply", action="store_true", help="Actually move folders. Without this, only prints a dry run.")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    moves = planned_moves(repo_root)

    if not moves:
        print("No folders need reorganization.")
        return

    print("Planned moves:")
    for source, target in moves:
        print(f"{source} -> {target}")

    if args.apply:
        apply_moves(moves)
        remove_empty_dirs(repo_root / "DSA")
    else:
        print("\nDry run only. Re-run with --apply to move folders.")


if __name__ == "__main__":
    main()
