## YYYY-MM-DD - Missing CSP in index.html
**Vulnerability:** index.html lacks a Content Security Policy (CSP) meta tag.
**Learning:** Modern web apps must enforce CSP to mitigate XSS attacks and control which external resources can be loaded, especially when using complex libraries like Mapbox/MapLibre that fetch remote styles, fonts, and tiles.
**Prevention:** Always include a strict CSP meta tag in index.html, allowing only known domains.
