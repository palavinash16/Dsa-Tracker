import base64

import requests


GITHUB_API_BASE = "https://api.github.com"


def get_access_token(code: str, client_id: str, client_secret: str, redirect_uri: str) -> str:
    url = "https://github.com/login/oauth/access_token"

    response = requests.post(
        url,
        headers={"Accept": "application/json"},
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
        },
        timeout=30,
    )
    response.raise_for_status()

    data = response.json()
    token = data.get("access_token")

    if not token:
        raise ValueError("GitHub access token not found in response.")

    return token


def get_user_profile(access_token: str) -> dict:
    response = requests.get(
        f"{GITHUB_API_BASE}/user",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def get_user_repositories(access_token: str) -> list[dict]:
    response = requests.get(
        f"{GITHUB_API_BASE}/user/repos",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        },
        params={
            "per_page": 100,
            "sort": "updated",
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def github_headers(access_token: str) -> dict:
    return {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def get_repository(access_token: str, repo_full_name: str) -> dict:
    response = requests.get(
        f"{GITHUB_API_BASE}/repos/{repo_full_name}",
        headers=github_headers(access_token),
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def get_file_sha(access_token: str, repo_full_name: str, path: str, branch: str) -> str | None:
    response = requests.get(
        f"{GITHUB_API_BASE}/repos/{repo_full_name}/contents/{path}",
        headers=github_headers(access_token),
        params={"ref": branch},
        timeout=30,
    )

    if response.status_code == 404:
        return None

    response.raise_for_status()
    return response.json().get("sha")


def upsert_file(
    access_token: str,
    repo_full_name: str,
    path: str,
    content: str,
    message: str,
    branch: str,
) -> dict:
    sha = get_file_sha(access_token, repo_full_name, path, branch)
    payload = {
        "message": message,
        "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
        "branch": branch,
    }

    if sha:
        payload["sha"] = sha

    response = requests.put(
        f"{GITHUB_API_BASE}/repos/{repo_full_name}/contents/{path}",
        headers=github_headers(access_token),
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def upsert_files(
    access_token: str,
    repo_full_name: str,
    files: dict[str, str],
    message: str,
    branch: str | None = None,
) -> dict:
    repo = get_repository(access_token, repo_full_name)
    target_branch = branch or repo.get("default_branch") or "main"
    results = []

    for path, content in files.items():
        result = upsert_file(
            access_token=access_token,
            repo_full_name=repo_full_name,
            path=path,
            content=content,
            message=message,
            branch=target_branch,
        )
        results.append({
            "path": path,
            "html_url": result.get("content", {}).get("html_url"),
            "commit_sha": result.get("commit", {}).get("sha"),
        })

    return {
        "success": True,
        "repo": repo_full_name,
        "branch": target_branch,
        "files": results,
    }
