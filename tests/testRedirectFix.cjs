const assert = require('assert');
const { downloadFile } = require('../scripts/utils/secureDownload.cjs');
const https = require('https');
const fs = require('fs');
const { PassThrough } = require('stream');

// Mock FS
const originalCreateWriteStream = fs.createWriteStream;
const mockFiles = {};
fs.createWriteStream = (path) => {
    const stream = new PassThrough();
    mockFiles[path] = stream;
    stream.close = () => {};
    return stream;
};

// Mock HTTPS
const originalGet = https.get;

function mockResponse(statusCode, headers = {}, body = '') {
    const stream = new PassThrough();
    stream.statusCode = statusCode;
    stream.headers = headers;
    // Emit data asynchronously to simulate real stream
    process.nextTick(() => {
        stream.write(body);
        stream.end();
    });
    return stream;
}

const tests = [
    async function testSecureDownload() {
        console.log('Test: Secure Download (Direct)');
        let requestedUrl;
        https.get = (url, cb) => {
            requestedUrl = url;
            const res = mockResponse(200);
            cb(res);
            return { on: () => {} };
        };

        await downloadFile('https://download.geonames.org/file.zip', 'test.zip');
        assert.strictEqual(requestedUrl, 'https://download.geonames.org/file.zip');
        console.log('✅ Passed');
    },

    async function testRedirect() {
        console.log('Test: Redirect Handling');
        let calls = [];
        https.get = (url, cb) => {
            calls.push(url);
            if (calls.length === 1) {
                const res = mockResponse(302, { location: 'https://download.geonames.org/redirected.zip' });
                cb(res);
            } else {
                const res = mockResponse(200);
                cb(res);
            }
            return { on: () => {} };
        };

        await downloadFile('https://download.geonames.org/initial.zip', 'test.zip');
        assert.strictEqual(calls.length, 2);
        assert.strictEqual(calls[1], 'https://download.geonames.org/redirected.zip');
        console.log('✅ Passed');
    },

    async function testInsecureProtocol() {
        console.log('Test: Insecure Protocol Rejection');
        try {
            await downloadFile('http://download.geonames.org/file.zip', 'test.zip');
            assert.fail('Should have thrown error');
        } catch (e) {
            assert(e.message.includes('Insecure protocol'));
        }
        console.log('✅ Passed');
    },

    async function testDisallowedHost() {
        console.log('Test: Disallowed Host Rejection');
        try {
            await downloadFile('https://evil.com/file.zip', 'test.zip');
            assert.fail('Should have thrown error');
        } catch (e) {
            assert(e.message.includes('Host not allowed'));
        }
        console.log('✅ Passed');
    },

    async function testRedirectToDisallowedHost() {
        console.log('Test: Redirect to Disallowed Host');
        https.get = (url, cb) => {
            if (url === 'https://download.geonames.org/safe.zip') {
                const res = mockResponse(302, { location: 'https://evil.com/malware.zip' });
                cb(res);
            } else {
                // Should not happen if validation works
                // But if it does, it's fine for this test case as long as downloadFile fails
                const res = mockResponse(200);
                cb(res);
            }
            return { on: () => {} };
        };

        try {
            await downloadFile('https://download.geonames.org/safe.zip', 'test.zip');
            assert.fail('Should have thrown error');
        } catch (e) {
            assert(e.message.includes('Host not allowed'));
        }
        console.log('✅ Passed');
    },

    async function testMaxRedirects() {
        console.log('Test: Max Redirects');
        let count = 0;
        https.get = (url, cb) => {
            count++;
            const res = mockResponse(302, { location: `https://download.geonames.org/file${count}.zip` });
            cb(res);
            return { on: () => {} };
        };

        try {
            await downloadFile('https://download.geonames.org/start.zip', 'test.zip');
            assert.fail('Should have thrown error');
        } catch (e) {
            assert(e.message.includes('Too many redirects'));
        }
        console.log('✅ Passed');
    }
];

async function runTests() {
    try {
        for (const test of tests) {
            await test();
        }
        console.log('\nALL TESTS PASSED 🎉');
    } catch (e) {
        console.error('\n❌ TEST FAILED:', e);
        process.exit(1);
    } finally {
        // Restore mocks
        fs.createWriteStream = originalCreateWriteStream;
        https.get = originalGet;
    }
}

runTests();
