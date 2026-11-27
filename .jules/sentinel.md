## 2025-03-12 - CSP for Web Maps
**Vulnerability:** Application lacked a Content Security Policy (CSP), allowing any domains to be loaded.
**Learning:** Adding a CSP to a map application requires carefully allowing tile subdomains. Tile servers (like `tiles.openfreemap.org` and `basemaps.cartocdn.com`) often use dynamic subdomains (e.g., `a.tiles...`) for load balancing, which must be whitelisted using wildcards (`https://*.tiles.openfreemap.org`). Also, `worker-src 'self' blob:;` is required for maplibre-gl Web Workers.
**Prevention:** Always test CSPs thoroughly in a staging/preview environment with the map fully loaded to catch blocked subdomain tile fetches.
