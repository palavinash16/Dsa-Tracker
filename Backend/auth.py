import os
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv

from github_service import get_access_token, get_user_profile, get_user_repositories

load_dotenv()

router = APIRouter()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5500")

REDIRECT_URI = f"{BACKEND_URL}/auth/github/callback"


@router.get("/auth/github/login")
def github_login():
    print("CLIENT ID:", GITHUB_CLIENT_ID)
    print("REDIRECT URI:", REDIRECT_URI)

    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Missing GITHUB_CLIENT_ID in .env")

    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": "repo read:user",
        "allow_signup": "true",
    }

    github_auth_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    return RedirectResponse(url=github_auth_url)


@router.get("/auth/github/callback")
def github_callback(code: str):
    try:
        if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
            raise HTTPException(
                status_code=500,
                detail="Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET in .env"
            )

        access_token = get_access_token(
            code=code,
            client_id=GITHUB_CLIENT_ID,
            client_secret=GITHUB_CLIENT_SECRET,
            redirect_uri=REDIRECT_URI,
        )

        user = get_user_profile(access_token)
        repos = get_user_repositories(access_token)

        return {
            "success": True,
            "access_token": access_token,
            "user": {
                "id": user.get("id"),
                "login": user.get("login"),
                "name": user.get("name"),
                "avatar_url": user.get("avatar_url"),
                "html_url": user.get("html_url"),
            },
            "repositories": [
                {
                    "id": repo.get("id"),
                    "name": repo.get("name"),
                    "full_name": repo.get("full_name"),
                    "private": repo.get("private"),
                    "default_branch": repo.get("default_branch"),
                    "html_url": repo.get("html_url"),
                }
                for repo in repos
            ],
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"GitHub OAuth failed: {str(e)}")