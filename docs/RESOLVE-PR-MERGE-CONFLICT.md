# Resolving PR merge conflicts (forked repo)

When the **upstream** (parent) repo has new commits, your PR can hit merge conflicts. Resolve them locally, then push to your fork.

## 1. Add upstream (one-time)

Replace `OWNER/REPO` with the **parent** repo (e.g. the org/team repo you forked from):

```bash
git remote add upstream https://github.com/OWNER/REPO.git
```

If upstream already exists, skip this or update the URL:

```bash
git remote set-url upstream https://github.com/OWNER/REPO.git
```

## 2. Fetch and merge upstream into your branch

Use the branch you opened the PR from (e.g. `component-library-setup`) and the upstream base branch (often `main`):

```bash
git fetch upstream
git checkout component-library-setup
git merge upstream/main
```

If Git reports conflicts, it will list the files.

## 3. Resolve conflicts

- Open each listed file and look for conflict markers:
  - `<<<<<<< HEAD` (your changes)
  - `=======` (separator)
  - `>>>>>>> upstream/main` (their changes)
- Edit the file to keep the correct code (remove the markers).
- Save, then:

```bash
git add <resolved-files>
git commit -m "Merge upstream/main and resolve conflicts"
git push origin component-library-setup
```

## 4. Re-run if more conflicts appear

If the upstream branch changed again, repeat from step 2.

---

**Quick reference**

| Your fork (your copy) | Upstream (parent repo you PR into) |
|----------------------|------------------------------------|
| `origin` → Pee-pheelips/XHedge | `upstream` → OWNER/REPO (set in step 1) |
