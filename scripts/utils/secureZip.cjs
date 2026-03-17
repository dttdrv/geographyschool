const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

/**
 * Extracts a ZIP file securely, mitigating Zip Slip (path traversal) vulnerabilities.
 * @param {string} zipPath - The path to the ZIP file.
 * @param {string} destDir - The destination directory.
 * @returns {Promise<void>}
 */
async function extractZip(zipPath, destDir) {
    console.log(`Extracting ${zipPath} securely...`);
    const zip = new AdmZip(zipPath);
    const targetDir = path.resolve(destDir);

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    zip.getEntries().forEach(function(zipEntry) {
        const entryPath = path.resolve(targetDir, zipEntry.entryName);

        // Mitigate Zip Slip
        if (!entryPath.startsWith(targetDir + path.sep)) {
            throw new Error(`Zip Slip vulnerability detected! Path traversal attempt: ${zipEntry.entryName}`);
        }

        if (zipEntry.isDirectory) {
            if (!fs.existsSync(entryPath)) {
                fs.mkdirSync(entryPath, { recursive: true });
            }
        } else {
            const entryDir = path.dirname(entryPath);
            if (!fs.existsSync(entryDir)) {
                fs.mkdirSync(entryDir, { recursive: true });
            }
            // Ensure we extract the specific entry cleanly without path traversal
            // AdmZip's extractEntryTo can handle the name implicitly if maintainEntryPath is false,
            // but we want to control the exact output file name based on our secure entryPath.
            // Using zip.readFile and fs.writeFileSync gives us absolute control over the output path.
            fs.writeFileSync(entryPath, zipEntry.getData());
        }
    });
}

module.exports = { extractZip };
