const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const AdmZip = require('adm-zip');
const { extractZip } = require('../scripts/utils/secureZip.cjs');

async function testZipSlip() {
    console.log('Testing Zip Slip vulnerability mitigation...');

    const tempDir = os.tmpdir();
    const testZipPath = path.join(tempDir, 'malicious.zip');
    const destDir = path.join(tempDir, 'extracted_zipslip');

    try {
        // Construct a malicious ZIP file
        const zip = new AdmZip();

        // Add a safe file
        zip.addFile('safe.txt', Buffer.from('I am a safe file.'));

        // Create an entry directly with a malicious name
        // adm-zip's `addFile` strips leading '../', so we modify the name directly
        const content = Buffer.from('I am evil!');
        zip.addFile('dummy.txt', content);
        const entries = zip.getEntries();
        entries[entries.length - 1].entryName = '../../../../../../../../../../../../../../../../../../../../../tmp/evil.txt';

        // Write the ZIP to disk
        zip.writeZip(testZipPath);

        console.log(`Malicious ZIP created at: ${testZipPath}`);

        // Ensure destination directory is clean
        if (fs.existsSync(destDir)) {
            fs.rmSync(destDir, { recursive: true, force: true });
        }

        let caughtError = false;

        try {
            // Attempt to extract the malicious ZIP
            await extractZip(testZipPath, destDir);
        } catch (error) {
            caughtError = true;
            assert.ok(
                error.message.includes('Zip Slip vulnerability detected'),
                `Unexpected error message: ${error.message}`
            );
            console.log('✅ Success: Zip Slip attempt correctly blocked by extractZip.');
        }

        assert.strictEqual(caughtError, true, 'extractZip failed to throw an error on Zip Slip attempt!');

        // Double check that the evil file wasn't created
        const evilPath = '/tmp/evil.txt';
        if (fs.existsSync(evilPath)) {
            fs.unlinkSync(evilPath);
            assert.fail('The malicious file was extracted despite the error!');
        }

    } catch (e) {
        console.error('❌ Zip Slip test failed:', e);
        process.exit(1);
    } finally {
        // Cleanup
        if (fs.existsSync(testZipPath)) fs.unlinkSync(testZipPath);
        if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
    }
}

testZipSlip().catch(console.error);
