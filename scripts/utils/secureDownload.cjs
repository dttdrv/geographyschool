const https = require('https');
const fs = require('fs');
const { URL } = require('url');

const MAX_REDIRECTS = 3;
const ALLOWED_HOSTS = ['download.geonames.org'];

/**
 * Downloads a file securely, enforcing HTTPS and domain restrictions.
 * @param {string} url - The URL to download.
 * @param {string} destPath - The destination file path.
 * @param {number} redirects - Internal counter for redirects.
 * @returns {Promise<void>}
 */
function downloadFile(url, destPath, redirects = 0) {
    return new Promise((resolve, reject) => {
        if (redirects > MAX_REDIRECTS) {
            return reject(new Error(`Too many redirects (max: ${MAX_REDIRECTS})`));
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch (e) {
            return reject(new Error(`Invalid URL: ${url}`));
        }

        if (parsedUrl.protocol !== 'https:') {
            return reject(new Error(`Insecure protocol: ${parsedUrl.protocol}. Only HTTPS is allowed.`));
        }

        if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
            return reject(new Error(`Host not allowed: ${parsedUrl.hostname}`));
        }

        console.log(`Downloading ${url}...${redirects > 0 ? ` (redirect ${redirects})` : ''}`);

        const request = https.get(url, (response) => {
            // Handle redirects
            if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
                const location = response.headers.location;
                if (!location) {
                    response.resume();
                    return reject(new Error(`Redirect with no location header`));
                }

                // Resolve relative URLs
                const redirectUrl = new URL(location, url).toString();

                // Recursively follow redirect
                response.resume(); // discard body
                return downloadFile(redirectUrl, destPath, redirects + 1)
                    .then(resolve)
                    .catch(reject);
            }

            if (response.statusCode === 200) {
                const file = fs.createWriteStream(destPath);

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    resolve();
                });

                file.on('error', (err) => {
                    file.close();
                    fs.unlink(destPath, () => {}); // Try to delete partial file
                    reject(err);
                });
            } else {
                response.resume(); // discard body
                reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
            }
        });

        request.on('error', (err) => {
            reject(err);
        });
    });
}

module.exports = { downloadFile };
