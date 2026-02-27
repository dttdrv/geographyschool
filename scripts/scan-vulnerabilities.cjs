/**
 * Sentinel Security Scanner
 *
 * This script scans the codebase for potential "Reverse Tabnabbing" vulnerabilities.
 * Specifically, it looks for `target="_blank"` usage in raw HTML strings (like template literals)
 * which are not caught by standard React linters (e.g. eslint-plugin-react).
 *
 * Limitations:
 * - Simple string matching; may produce false positives on commented code.
 * - Does not parse AST; assumes attributes are on the same line or standard formatting.
 *
 * Usage: node scripts/scan-vulnerabilities.cjs
 */

const fs = require('fs');
const path = require('path');

const SCAN_DIR = path.join(__dirname, '../src');
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.html'];

let issuesFound = 0;

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        if (line.includes('target="_blank"')) {
            // Check for rel="noopener" or rel="noreferrer"
            // We use simple string matching here. It doesn't handle multi-line tags perfectly,
            // but it's sufficient for catching single-line cases like the one we fixed.
            const hasNoOpener = line.includes('rel="noopener') || line.includes("rel='noopener");
            const hasNoReferrer = line.includes('rel="noreferrer') || line.includes("rel='noreferrer");

            // Also handle combined attributes like rel="noopener noreferrer"
            const hasCombined = line.includes('noopener noreferrer') || line.includes('noreferrer noopener');

            if (!hasNoOpener && !hasNoReferrer && !hasCombined) {
                console.error(`\n❌ Security Vulnerability found in ${path.relative(process.cwd(), filePath)}:${index + 1}`);
                console.error(`   Line: ${line.trim()}`);
                console.error(`   Reason: target="_blank" found without rel="noopener" or rel="noreferrer"`);
                issuesFound++;
            }
        }
    });
}

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            scanDirectory(filePath);
        } else if (EXTENSIONS.includes(path.extname(file))) {
            scanFile(filePath);
        }
    });
}

console.log('🛡️  Sentinel Security Scan: Checking for Reverse Tabnabbing in raw strings...');
try {
    scanDirectory(SCAN_DIR);
} catch (error) {
    console.error('Error scanning directory:', error);
    process.exit(1);
}

if (issuesFound > 0) {
    console.error(`\n🚨 Scan failed! Found ${issuesFound} security issues.`);
    process.exit(1);
} else {
    console.log('\n✅ Scan passed! No Reverse Tabnabbing vulnerabilities found.');
    process.exit(0);
}
