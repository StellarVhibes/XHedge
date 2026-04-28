#!/bin/bash
REPO="StellarVhibes/XHedge"
ISSUES=($(gh issue list --repo "$REPO" --limit 50 --json number --jq '.[].number'))

for i in "${ISSUES[@]}"; do
  # Check if issue belongs to our set or has the wrong label
  # To be safe, I will try to remove 'stellar-wave' and add 'Stellar Wave' for all recent issues
  if [ "$i" -ge 218 ]; then
    echo "Processing issue #$i..."
    gh issue edit "$i" --repo "$REPO" --add-label "Stellar Wave" --remove-label "stellar-wave"
  fi
done

# Force delete the kebab-case label
gh label delete "stellar-wave" --repo "$REPO" --yes
