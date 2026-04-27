#!/bin/bash
REPO="StellarVhibes/XHedge"
ISSUES=(218 219 220 221 222 223 224 225 226 227 228)

# Ensure 'Stellar Wave' label exists (it likely does based on previous checks)
gh label create "Stellar Wave" --color "#5555ff" --description "Issues in the Stellar wave program" --repo "$REPO" --force

for i in "${ISSUES[@]}"; do
  echo "Updating issue #$i..."
  gh issue edit "$i" --repo "$REPO" --add-label "Stellar Wave" --remove-label "stellar-wave"
done

# Delete the old label
gh label delete "stellar-wave" --repo "$REPO" --yes
