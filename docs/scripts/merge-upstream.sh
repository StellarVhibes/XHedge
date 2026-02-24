#!/bin/bash
# Merge upstream base branch into your PR branch to resolve conflicts.
# 1. Set UPSTREAM_REPO (e.g. https://github.com/SomeOrg/XHedge.git)
# 2. Set BASE_BRANCH if not main
# 3. Run: ./scripts/merge-upstream.sh

set -e
UPSTREAM_REPO="${UPSTREAM_REPO:-}"
BASE_BRANCH="${BASE_BRANCH:-main}"
CURRENT_BRANCH="$(git branch --show-current)"

if [ -z "$UPSTREAM_REPO" ]; then
  echo "Set the parent repo URL, then run again:"
  echo "  UPSTREAM_REPO=https://github.com/OWNER/XHedge.git ./scripts/merge-upstream.sh"
  exit 1
fi

if ! git remote get-url upstream &>/dev/null; then
  git remote add upstream "$UPSTREAM_REPO"
  echo "Added remote: upstream -> $UPSTREAM_REPO"
else
  git remote set-url upstream "$UPSTREAM_REPO"
  echo "Updated remote: upstream -> $UPSTREAM_REPO"
fi

echo "Fetching upstream/$BASE_BRANCH..."
git fetch upstream "$BASE_BRANCH"
echo "Merging upstream/$BASE_BRANCH into $CURRENT_BRANCH..."
git merge "upstream/$BASE_BRANCH" --no-edit

echo "Done. If there were conflicts, fix the files then: git add . && git commit && git push origin $CURRENT_BRANCH"
echo "If no conflicts, push with: git push origin $CURRENT_BRANCH"
