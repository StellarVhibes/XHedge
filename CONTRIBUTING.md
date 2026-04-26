# Contributing to XHedge

Thank you for your interest in building the future of inflation protection on Stellar! This guide will help you contribute effectively.

## 🛠 Tech Stack

*   **Smart Contracts:** Soroban asset management logic (Rust)
*   **Frontend:** Next.js, TypeScript, Tailwind CSS, Freighter Wallet
*   **AI Engine:** Time-series FX forecasting (Python/FastAPI)
*   **Data:** Central Bank APIs, Market Feeds

## 📝 Commit Guidelines (Strict)

We follow a strict **Modular Commit** philosophy to ensure history is readable and revertible.

**The Golden Rule:**
> "Commit after every meaningful change, not every line."

*   **Meaningful Change:** Completing a function, finishing a fix, adding a feature block, creating a file, or making a significant modification.
*   **Avoid:** Micro-commits for single-line edits unless they are standalone fixes.
*   **Frequency:** Commit often, but only when you finish a logical piece of work.

### Example Commit Messages
*   `feat(contract): implement yield allocation logic`
*   `fix(ui): correct risk visualization chart`
*   `docs: update fx data source list`

## 📋 Issue Tracking

1.  Pick an issue from the `docs/` folder.
2.  When you start, comment on the issue or mark it as "In Progress".
3.  **When Completed:** You MUST update the issue file with:
    *   Check the box `[x]`
    *   Append your GitHub username and Date/Time.
    *   *Example:* `- [x] Integrate FX Feed (@bbkenny - 2023-10-27 14:00)`

## 🧪 Development Workflow

1.  **Clone**: Clone the repo locally.
2.  **Branch**: Create a feature branch (`feat/my-feature`).
3.  **Develop**: Write code following the Style Guide (`STYLE.md`).
4.  **Test**: Run `cargo test` (contracts) or `npm run test` (frontend).
5.  **Commit**: Follow the commit guidelines above.

## 🔗 Pull Request Checklist

When opening a PR, follow these steps:

1.  **Link the Issue**: In your PR description, use:
    - `Closes #26` — when your PR resolves the issue
    - `Fixes #26` — when your PR fixes a bug
    - `Resolves #26` — when your PR fully resolves it
    Example:
    ```
    ## Summary
    - Added detailed event logging for AI analysis
    
    Closes #26
    ```

2.  **Tag Both Issue & PR**: 
    - On the **issue**: Comment tagging the author (`@username`) to let them know you're working on it
    - On the **PR**: Tag `@bbkenny` to notify maintainer(s) review is ready
    Example on issue:
    > Hey @bbkenny, I've got a PR ready for this. Want to check it out when you get a chance?
    Example on PR comment:
    > @bbkenny, PR is ready for review!

3.  **Keep PRs Small**: Only fix what's needed. Don't rewrite entire files or change hundreds of lines when the issue only needs a few lines fixed. Real devs fix the specific problem, not everything.

## Getting Help

Read the **Integration Guides** located in the `docs/` directory for detailed setup instructions.
