#!/usr/bin/env python3
"""
Assign a GitHub issue to the Copilot coding agent using the REST API.

Default behavior:
1. Auto-resolve owner/repo from the git remote origin URL
2. Read token from CLI argument or GITHUB_TOKEN environment variable
3. Call POST /repos/{owner}/{repo}/issues/{issue_number}/assignees
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


def assign_issue_to_copilot(
    owner: str,
    repo: str,
    token: str,
    issue_number: int,
    base_branch: str = "main",
    custom_instructions: str = "",
    custom_agent: str = "",
    model: str = "",
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "assignees": ["copilot-swe-agent[bot]"],
        "agent_assignment": {
            "target_repo": f"{owner}/{repo}",
            "base_branch": base_branch,
            "custom_instructions": custom_instructions,
            "custom_agent": custom_agent,
            "model": model,
        },
    }

    req = request.Request(
        url=f"{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{issue_number}/assignees",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": API_VERSION,
            "Content-Type": "application/json",
        },
    )

    with request.urlopen(req) as response:
        return json.loads(response.read().decode("utf-8"))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Assign a GitHub issue to the Copilot coding agent using the REST API"
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
        "-b",
        "--branch",
        default="main",
        help="Base branch for Copilot to work on (default: main)",
    )
    parser.add_argument(
        "-i",
        "--instructions",
        default="",
        help="Additional instructions for Copilot",
    )
    parser.add_argument(
        "-c",
        "--custom-agent",
        default="",
        help="Custom agent file, e.g. .github/agents/issue-commit-context.agent.md",
    )
    parser.add_argument(
        "-m",
        "--model",
        default="gpt-5.4",
        help="Optional model field; leave empty to use GitHub default",
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
        result = assign_issue_to_copilot(
            owner=owner,
            repo=repo,
            token=token,
            issue_number=args.number,
            base_branch=args.branch,
            custom_instructions=args.instructions,
            custom_agent=args.custom_agent,
            model=args.model,
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
            print("Error: Insufficient permissions. Token may lack repo or issues write access", file=sys.stderr)
        elif exc.code == 404:
            print(f"Error: Repository {owner}/{repo} or issue #{args.number} not found, or token lacks access", file=sys.stderr)
        elif exc.code == 422:
            print("Error: Invalid request. Copilot may not be enabled, issue state may not allow assignment, or agent_assignment params are invalid", file=sys.stderr)
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

    assignees = ", ".join(assignee["login"] for assignee in result.get("assignees", []))
    print(f"Assigned issue #{args.number} to Copilot")
    print(f"Repository: {owner}/{repo}")
    print(f"Assignees: {assignees}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
