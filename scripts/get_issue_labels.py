#!/usr/bin/env python3
"""
Get the labels of a GitHub issue using the REST API.

Default behavior:
1. Auto-resolve owner/repo from the git remote origin URL
2. Read token from CLI argument or GITHUB_TOKEN environment variable
3. Call GET /repos/{owner}/{repo}/issues/{issue_number}/labels
4. Output one label name per line by default for easy use with grep in shell
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


def get_issue_labels(
    owner: str,
    repo: str,
    issue_number: int,
    token: str,
) -> list[dict[str, Any]]:
    req = request.Request(
        url=f"{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{issue_number}/labels",
        method="GET",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": API_VERSION,
        },
    )

    with request.urlopen(req) as response:
        return json.loads(response.read().decode("utf-8"))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Get the labels of a GitHub issue using the REST API"
    )
    parser.add_argument("number", type=int, help="Issue number")
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
        "--json",
        action="store_true",
        help="Output full JSON label object list",
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
        labels = get_issue_labels(
            owner=owner,
            repo=repo,
            issue_number=args.number,
            token=token,
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
            print("Error: Insufficient permissions. Token may lack repo or issues read access", file=sys.stderr)
        elif exc.code == 404:
            print(f"Error: Repository {owner}/{repo} or issue #{args.number} not found, or token lacks access", file=sys.stderr)
        else:
            print(f"HTTP error {exc.code}", file=sys.stderr)

        print(parsed_body, file=sys.stderr)
        return 1
    except error.URLError as exc:
        print(f"Error: Failed to connect to GitHub API: {exc.reason}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(labels, indent=2, ensure_ascii=False))
        return 0

    for label in labels:
        print(label["name"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
