## 2024-05-24 - Add Content Security Policy

**Vulnerability:** Missing Content Security Policy (CSP) in index.html.
**Learning:** Without a CSP, the application is highly vulnerable to Cross-Site Scripting (XSS) attacks. Since the app dynamically loads map tiles, external fonts, and boundary data, it is crucial to restrict the origins of these resources to prevent malicious script injection or unauthorized data exfiltration.
**Prevention:** Implement a strict CSP via a `<meta>` tag in `index.html` that explicitly whitelists the required external domains (openfreemap.org, cartocdn.com, arcgisonline.com, rainviewer.com, githubusercontent.com, fonts.googleapis.com, fonts.gstatic.com) and restricts script/style execution appropriately.
