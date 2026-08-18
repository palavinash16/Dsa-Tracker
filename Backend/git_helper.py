import subprocess
from pathlib import Path


def run_git_command(command: list[str], repo_path: str):
    try:
        result = subprocess.run(
            command,
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True,
        )
        return True, result.stdout.strip() or result.stderr.strip() or "Command executed successfully."
    except subprocess.CalledProcessError as e:
        output = (e.stdout or "").strip()
        error = (e.stderr or "").strip()
        combined = error if error else output if output else str(e)
        return False, combined


def relative_paths(repo_path: str, paths: list[str] | None) -> list[str]:
    if not paths:
        return ["."]

    root = Path(repo_path).resolve()
    relatives = []

    for path in paths:
        resolved = Path(path).resolve()
        try:
            relatives.append(str(resolved.relative_to(root)).replace("\\", "/"))
        except ValueError:
            continue

    return relatives or ["."]


def git_add_commit_push(repo_path: str, commit_message: str, paths: list[str] | None = None):
    repo = Path(repo_path)

    if not repo.exists():
        return {
            "success": False,
            "message": f"Repository path not found: {repo_path}"
        }

    if not (repo / ".git").exists():
        return {
            "success": False,
            "message": f"Path is not a Git repository: {repo_path}"
        }

    logs = []
    pathspecs = relative_paths(repo_path, paths)

    success, output = run_git_command(["git", "remote", "-v"], repo_path)
    logs.append({"step": "remote", "success": success, "output": output})
    if not success or not output.strip():
        return {
            "success": False,
            "step": "remote",
            "message": "No GitHub remote is configured for this repository.",
            "logs": logs
        }

    success, output = run_git_command(["git", "add", *pathspecs], repo_path)
    logs.append({"step": "add", "success": success, "output": output})
    if not success:
        return {
            "success": False,
            "step": "add",
            "message": output,
            "logs": logs
        }

    success, output = run_git_command(["git", "status", "--porcelain", "--", *pathspecs], repo_path)
    logs.append({"step": "status", "success": success, "output": output})
    if not success:
        return {
            "success": False,
            "step": "status",
            "message": output,
            "logs": logs
        }

    if not output.strip():
        return {
            "success": True,
            "message": "No changes to commit.",
            "logs": logs
        }

    success, output = run_git_command(["git", "commit", "-m", commit_message, "--", *pathspecs], repo_path)
    logs.append({"step": "commit", "success": success, "output": output})
    if not success:
        return {
            "success": False,
            "step": "commit",
            "message": output,
            "logs": logs
        }

    success, output = run_git_command(["git", "push"], repo_path)
    logs.append({"step": "push", "success": success, "output": output})
    if not success:
        return {
            "success": False,
            "step": "push",
            "message": output,
            "logs": logs
        }

    return {
        "success": True,
        "message": "Pushed successfully",
        "logs": logs
    }
