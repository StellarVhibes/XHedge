# Security Policy

## Supported Versions

Only the latest version of XHedge smart contracts is supported for security updates.

| Version | Supported          |
| ------- | ------------------ |
| v1.0.x  | :white_check_mark: |
| < v1.0  | :x:                |

## Reporting a Vulnerability

We take the security of XHedge seriously. If you find a security vulnerability, please do NOT report it via a public issue. Instead, please follow the disclosure process below.

### Disclosure Process

1.  **Report:** Send an email to `security@xhedge.finance` (or contact the maintainer @bbkenny) with a detailed description of the vulnerability.
2.  **Confirmation:** We will acknowledge receipt of your report within 48 hours.
3.  **Triage:** Our team will investigate and confirm the vulnerability.
4.  **Fix:** We will work on a fix and coordinate a release.
5.  **Disclosure:** Once the fix is released, we will publicly disclose the vulnerability (with credit to the reporter).

### Out of Scope

-   Social engineering attacks.
-   Phishing or other non-technical attacks.
-   Vulnerabilities in third-party dependencies (unless they directly affect XHedge).

## Security Best Practices

XHedge contracts are built using the Soroban SDK and follow strict security guidelines:
-   **Upgradability:** All contract upgrades require multi-signature approval.
-   **Audits:** We perform regular internal and external security audits.
-   **Static Analysis:** All code is checked with `cargo clippy` and other static analysis tools.

Thank you for helping keep XHedge secure!
