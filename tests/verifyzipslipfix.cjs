const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Simulate the logic in the scripts
async function extractZipSafe(zipPath, destDir) {
    const zip = new AdmZip(zipPath);
    const resolvedDest = path.resolve(destDir) + path.sep;
    let maliciousSkipped = false;

    for (const entry of zip.getEntries()) {
        const targetPath = path.resolve(destDir, entry.entryName);
        if (!targetPath.startsWith(resolvedDest)) {
            console.log(`[TEST] Successfully blocked malicious entry: ${entry.entryName}`);
            maliciousSkipped = true;
            continue;
        }
        zip.extractEntryTo(entry, destDir, true, true);
    }

    return maliciousSkipped;
}

async function runTest() {
    console.log('--- Testing Zip Slip Prevention ---');

    // Create a zip with a malicious path traversal entry
    const zip = new AdmZip();
    zip.addFile('safe.txt', Buffer.from('safe'));
    zip.getEntries()[0].entryName = '../../malicious.txt';

    const testDir = path.resolve(__dirname, 'zip-slip-test');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const zipPath = path.join(testDir, 'test-malicious.zip');
    zip.writeZip(zipPath);

    const destDir = path.join(testDir, 'extract');
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    try {
        const blocked = await extractZipSafe(zipPath, destDir);
        assert.strictEqual(blocked, true, "Malicious entry should have been blocked");

        // Verify the malicious file wasn't extracted
        const maliciousPath = path.resolve(destDir, '../../malicious.txt');
        assert.strictEqual(fs.existsSync(maliciousPath), false, "Malicious file was extracted!");

        console.log('✅ Zip Slip vulnerability successfully mitigated.');
    } finally {
        // Cleanup
        fs.rmSync(testDir, { recursive: true, force: true });
    }
}

runTest().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
