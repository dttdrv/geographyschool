## 2024-05-18 - Missing Content Security Policy (CSP)
**Vulnerability:** The application was missing a Content Security Policy (CSP), leaving it vulnerable to Cross-Site Scripting (XSS) and unauthorized data transmission.
**Learning:** When adding a CSP to a MapLibre GL JS and Vite project, several specific directives are required: `worker-src 'self' blob:;` for web workers, wildcard/specific domains for tile/glyph/data endpoints (e.g., `*.tiles.openfreemap.org`, `https://api.rainviewer.com`, `*.cartocdn.com`), and `'unsafe-inline'`/`'unsafe-eval'` for Vite development.
**Prevention:** Ensure that all new web applications start with a restrictive CSP and iteratively add only the necessary external domains and unsafe directives required by the framework and libraries.
