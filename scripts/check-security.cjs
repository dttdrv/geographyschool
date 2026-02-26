const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', 'src');
const EXCLUDE_DIRS = ['assets', 'styles'];

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    let hasError = false;

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!EXCLUDE_DIRS.includes(file)) {
                if (scanDir(fullPath)) hasError = true;
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');

            // Check for target="_blank" without rel="noopener"
            const targetBlankRegex = /target="_blank"/g;
            let match;
            while ((match = targetBlankRegex.exec(content)) !== null) {
                // Look around the match to see if rel="noopener" or rel="noreferrer" is present in the same tag
                // This is a naive check, but good enough for a basic safeguard
                const startTagStart = content.lastIndexOf('<', match.index);
                const startTagEnd = content.indexOf('>', match.index);

                if (startTagStart !== -1 && startTagEnd !== -1) {
                    const tag = content.substring(startTagStart, startTagEnd + 1);
                    if (!tag.includes('rel="noopener') && !tag.includes("rel='noopener") &&
                        !tag.includes('rel="noreferrer') && !tag.includes("rel='noreferrer")) {
                        console.error(`❌ Security Warning: target="_blank" without rel="noopener" or rel="noreferrer" found in ${fullPath}`);
                        console.error(`   Context: ${tag.trim()}`);
                        hasError = true;
                    }
                }
            }
        }
    }
    return hasError;
}

console.log('🛡️ Sentinel Security Scan: Checking for common vulnerabilities...');
if (scanDir(ROOT_DIR)) {
    console.error('\n🚫 Security check failed! Please fix the issues above.');
    process.exit(1);
} else {
    console.log('\n✅ Security check passed!');
}
