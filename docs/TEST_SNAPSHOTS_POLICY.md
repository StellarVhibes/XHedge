# Test Snapshots Policy

**CRITICAL RULE FOR ALL CONTRIBUTORS:**

The `test_snapshots/` directory is strictly ignored by git and **MUST NEVER** be pushed to the repository. 

### Why?
When running tests in Rust/Soroban, the framework often generates local test snapshot files (JSON). These snapshots contain local, environment-specific state or extremely verbose output that causes massive, unnecessary PR diffs (sometimes thousands of lines long).

### Contributor Guidelines
1. Do not forcefully add test snapshots using `git add -f`.
2. Always ensure your `.gitignore` is properly ignoring `test_snapshots/`.
3. Review your PR diffs carefully. If you see `.json` snapshot files in your PR, remove them before requesting a review.
