#!/usr/bin/env python3
"""
Create a new branch from the repository default branch using the GitHub REST API.

Default behavior:
1. Auto-resolve owner/repo from the git remote origin URL
2. Read token from CLI argument or GITHUB_TOKEN environment variable
3. Query the repository default branch
4. Get the latest commit SHA of the default branch
5. Create refs/heads/{new_branch}
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from typing import Any
from urllib import error, parse, request


API_VERSION = "2022-11-28"
GITHUB_API_BASE = "https://api.github.com"


def get_git_remote_url() -> str:
    result = subprocess.run(
        ["git", "config", "--get", "remote.origin.url"],
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode != 0 or not result.stdout.strip():
        raise ValueError("Failed to read git remote.origin.url. Make sure the current directory is a Git repository")

    return result.stdout.strip()


def parse_owner_repo(remote_url: str) -> tuple[str, str]:
    cleaned = remote_url.strip()
    if cleaned.endswith(".git"):
        cleaned = cleaned[:-4]

    if cleaned.startswith("git@github.com:"):
        path = cleaned.split(":", 1)[1]
    else:
        parsed = parse.urlparse(cleaned)
        if parsed.netloc.lower() != "github.com":
            raise ValueError(f"Remote is not a GitHub URL: {remote_url}")
        path = parsed.path.lstrip("/")

    parts = [part for part in path.split("/") if part]
    if len(parts) != 2:
        raise ValueError(f"Failed to parse owner/repo from remote: {remote_url}")

    return parts[0], parts[1]


def github_request(
    method: str,
    url: str,
    token: str,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    data = None
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": API_VERSION,
    }

    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = request.Request(url=url, data=data, method=method, headers=headers)
    with request.urlopen(req) as response:
        return json.loads(response.read().decode("utf-8"))


def get_default_branch(owner: str, repo: str, token: str) -> str:
    repo_data = github_request("GET", f"{GITHUB_API_BASE}/repos/{owner}/{repo}", token)
    default_branch = repo_data.get("default_branch")
    if not default_branch:
        raise ValueError(f"Repository {owner}/{repo} did not return a default_branch")
    return default_branch


def get_branch_sha(owner: str, repo: str, branch_name: str, token: str) -> str:
    ref_data = github_request(
        "GET",
        f"{GITHUB_API_BASE}/repos/{owner}/{repo}/git/ref/heads/{parse.quote(branch_name, safe='')}",
        token,
    )
    sha = ref_data.get("object", {}).get("sha")
    if not sha:
        raise ValueError(f"Failed to get commit SHA for branch {branch_name}")
    return sha


def create_branch(
    owner: str,
    repo: str,
    token: str,
    new_branch_name: str,
    source_branch: str | None = None,
) -> tuple[dict[str, Any], str]:
    base_branch = source_branch or get_default_branch(owner, repo, token)
    base_sha = get_branch_sha(owner, repo, base_branch, token)
    result = github_request(
        "POST",
        f"{GITHUB_API_BASE}/repos/{owner}/{repo}/git/refs",
        token,
        payload={
            "ref": f"refs/heads/{new_branch_name}",
            "sha": base_sha,
        },
    )
    return result, base_branch


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Create a new branch from the repository default branch using the GitHub REST API"
    )
    parser.add_argument("branch", help="Name of the new branch to create")
    parser.add_argument(
        "-r",
        "--repo",
        help="Target repository in owner/repo format; auto-resolved from git origin if omitted",
    )
    parser.add_argument(
        "-t",
        "--token",
        help="GitHub token; falls back to GITHUB_TOKEN env var if omitted",
    )
    parser.add_argument(
        "-s",
        "--source-branch",
        default=None,
        help="Optional source branch; uses repository default branch if omitted",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output full JSON response",
    )
    return parser


def resolve_owner_repo(repo_arg: str | None) -> tuple[str, str]:
    if repo_arg:
        parts = repo_arg.split("/")
        if len(parts) != 2 or not all(parts):
            raise ValueError("--repo format should be owner/repo")
        return parts[0], parts[1]

    return parse_owner_repo(get_git_remote_url())


def main() -> int:
    args = build_parser().parse_args()

    token = args.token or os.getenv("GITHUB_TOKEN")
    if not token:
        print("Error: Missing GitHub token. Provide via --token or GITHUB_TOKEN environment variable", file=sys.stderr)
        return 1

    owner = ""
    repo = ""

    try:
        owner, repo = resolve_owner_repo(args.repo)
        result, base_branch = create_branch(
            owner=owner,
            repo=repo,
            token=token,
            new_branch_name=args.branch,
            source_branch=args.source_branch,
        )
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except error.HTTPError as exc:
        response_body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed_body = json.loads(response_body)
        except json.JSONDecodeError:
            parsed_body = response_body

        if exc.code == 401:
            print("Error: Authentication failed. Check your GitHub token", file=sys.stderr)
        elif exc.code == 403:
            print("Error: Insufficient permissions. Token may lack repo write access", file=sys.stderr)
        elif exc.code == 404:
            print(f"Error: Repository {owner}/{repo} or source branch not found, or token lacks access", file=sys.stderr)
        elif exc.code == 422:
            print("Error: Invalid request. Branch may already exist or branch name is invalid", file=sys.stderr)
        else:
            print(f"HTTP error {exc.code}", file=sys.stderr)

        print(parsed_body, file=sys.stderr)
        return 1
    except error.URLError as exc:
        print(f"Error: Failed to connect to GitHub API: {exc.reason}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0

    print(f"Created branch: {args.branch}")
    print(f"Repository: {owner}/{repo}")
    print(f"Base branch: {base_branch}")
    print(f"ref: {result['ref']}")
    print(f"sha: {result['object']['sha']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
