## 2025-03-04 - [Missing Content Security Policy]
**Vulnerability:** A Content Security Policy (CSP) `<meta>` tag was expected in `index.html` (based on internal notes indicating required domains for tiles and APIs) but was entirely missing.
**Learning:** Even if CSP is documented or implied as a requirement for certain external services, it can easily be omitted or accidentally removed from the `index.html` file, leaving the app vulnerable to XSS and injection attacks.
**Prevention:** Include CSP verification in automated security checks/linters to ensure the tag exists and correctly explicitly lists all required domains (like `openfreemap.org`, `cartocdn.com`, `arcgisonline.com`, `rainviewer.com`, `githubusercontent.com`).
