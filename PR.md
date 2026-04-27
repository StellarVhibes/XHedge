# [FE-42a] Accessibility — Semantic Markup & ARIA

Closes #251

## Description
This Pull Request addresses the high-severity `<Accessibility>` issue detailed in #251. I've conducted a manual comprehensive audit with `axe-core` standards and ensured semantic markup, screen reader capabilities, and visual contrast criteria have been satisfied.

### Summary of Changes
- **Semantic Navigation**: Wrapped the main application menu in `<nav id="sidebar-navigation">` and attached an explicit `aria-label`.
- **Keyboard Navigation Enhancements**: 
  - Developed and implemented a "Skip to main content" mechanism (`#main-content`) that only manifests on keyboard focus within `dashboard-layout.tsx` to enable seamless keyboard UX.
  - Supplied prominent explicit `focus-visible` outline rings to interactive components like buttons and sidebar navigation tags ensuring strict keyboard-compliance.
- **Dynamic Content & Announcer**: Appended an `aria-live="polite"` container that actively announces whenever the mobile sidebar opens/closes ensuring synchronous awareness for screen reader users.
- **Valid ARIA Definitions**: Integrated accurate `aria-expanded`, `aria-controls`, and `aria-hidden` tags globally allowing for assistive technologies to digest accurate states. Purely administrative illustrations (e.g. `lucide-react` icons) were accurately hidden utilizing `aria-hidden="true"`.
- **Contrast Ratios Enforcement**: Hardened generic themes inside `globals.css`—specifically dimming `<muted-foreground>` and `<secondary-foreground>` in the light theme so that every single piece of foreground text effortlessly clears the `4.5:1 minimum WCAG bounds`.

## Integrity Affirmation
- [x] Confirmed application renders successfully
- [x] Run `npm install --legacy-peer-deps && npm run build` verified completely intact.
- [x] `axe-core` semantic violations resolved cleanly.

*(Optional visual proof can be attached below before submitting)*
