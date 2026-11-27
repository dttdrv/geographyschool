## 2026-03-03 - [Add CSP Headers]
**Vulnerability:** Missing Content Security Policy (CSP) allowed uncontrolled execution of scripts and loading of resources, increasing risk of XSS and data exfiltration.
**Learning:** The application heavily relies on external services for map tiles (OpenFreeMap, Carto, Esri) and GeoJSON data (GeoBoundaries). A strict CSP must explicitly whitelist these domains to prevent breaking map rendering and search functionality.
**Prevention:** Implement a baseline CSP in index.html that explicitly allows required domains while restricting default execution contexts.
