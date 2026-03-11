/**
 * Download and process ALL countries' full GeoNames data
 * Includes alternate names for multi-language search
 * 
 * Run with: node scripts/processAllCountries.cjs
 */

const fs = require('fs');
const path = require('path');
const { downloadFile } = require('./utils/secureDownload.cjs');
const readline = require('readline');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data', 'villages');
const TEMP_DIR = path.join(__dirname, '..', 'temp', 'countries');

// Priority countries to process (can add more later)
const COUNTRIES = [
    'BG', 'IT', 'DE', 'FR', 'GB', 'ES', 'GR', 'RO', 'RS', 'MK', 'TR',
    'AT', 'CH', 'NL', 'BE', 'PL', 'CZ', 'SK', 'HU', 'HR', 'SI', 'AL',
    'PT', 'IE', 'DK', 'SE', 'NO', 'FI', 'RU', 'UA', 'BY', 'MD',
    'US', 'CA', 'MX', 'BR', 'AR', 'AU', 'NZ', 'JP', 'KR', 'CN', 'IN'
];

const COLS = {
    geonameid: 0,
    name: 1,
    asciiname: 2,
    alternatenames: 3,
    latitude: 4,
    longitude: 5,
    featureClass: 6,
    featureCode: 7,
    countryCode: 8,
    population: 14,
};


async function extractZip(zipPath, destDir) {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(zipPath);

    // Ensure destDir is an absolute path with a trailing separator for safe prefix checking
    const resolvedDest = path.resolve(destDir) + path.sep;

    for (const entry of zip.getEntries()) {
        const targetPath = path.resolve(destDir, entry.entryName);

        // SECURITY: Prevent Zip Slip path traversal vulnerability
        if (!targetPath.startsWith(resolvedDest)) {
            console.warn(`[SECURITY WARNING] Skipping malicious zip entry attempting path traversal: ${entry.entryName}`);
            continue;
        }

        zip.extractEntryTo(entry, destDir, true, true);
    }
}

function parseGeoNamesLine(line) {
    const fields = line.split('\t');
    if (fields.length < 18) return null;

    const featureClass = fields[COLS.featureClass];
    if (featureClass !== 'P' && featureClass !== 'A') return null;

    const lat = parseFloat(fields[COLS.latitude]);
    const lng = parseFloat(fields[COLS.longitude]);
    if (isNaN(lat) || isNaN(lng)) return null;

    const pop = parseInt(fields[COLS.population]) || 0;
    const name = fields[COLS.name];
    const asciiname = fields[COLS.asciiname];
    const alternatenames = fields[COLS.alternatenames];

    // Extract useful alternate names (limit to avoid bloat)
    let altNames = [];
    if (alternatenames) {
        altNames = alternatenames.split(',')
            .filter(n => n && n !== name && n !== asciiname)
            .slice(0, 5);  // Max 5 alternate names
    }

    const entry = {
        id: fields[COLS.geonameid],
        n: name,
        lat: Math.round(lat * 100000) / 100000,
        lng: Math.round(lng * 100000) / 100000,
        p: pop,
    };

    // Only add optional fields if they have value
    if (asciiname && asciiname !== name) entry.a = asciiname;
    if (altNames.length > 0) entry.alt = altNames;

    return entry;
}

async function processCountry(countryCode) {
    const zipPath = path.join(TEMP_DIR, `${countryCode}.zip`);
    const txtPath = path.join(TEMP_DIR, `${countryCode}.txt`);
    const url = `https://download.geonames.org/export/dump/${countryCode}.zip`;

    // Download if needed
    if (!fs.existsSync(txtPath)) {
        if (!fs.existsSync(zipPath)) {
            console.log(`  Downloading ${countryCode}...`);
            try {
                await downloadFile(url, zipPath);
            } catch (e) {
                console.log(`  ⚠ Could not download ${countryCode}: ${e.message}`);
                return null;
            }
        }
        await extractZip(zipPath, TEMP_DIR);
    }

    // Process file
    const entries = [];
    const fileStream = fs.createReadStream(txtPath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
        const entry = parseGeoNamesLine(line);
        if (entry) entries.push(entry);
    }

    // Sort by population
    entries.sort((a, b) => b.p - a.p);

    return entries;
}

async function main() {
    console.log('Processing all countries for village data...\n');

    fs.mkdirSync(TEMP_DIR, { recursive: true });
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const index = { countries: [], totalEntries: 0 };

    for (const cc of COUNTRIES) {
        process.stdout.write(`Processing ${cc}... `);

        const entries = await processCountry(cc);
        if (!entries) continue;

        // Check size and split if needed
        const MAX_SIZE = 15 * 1024 * 1024; // 15MB safety limit
        const jsonStr = JSON.stringify(entries);

        let chunks = 1;

        if (jsonStr.length > MAX_SIZE) {
            chunks = Math.ceil(jsonStr.length / MAX_SIZE);
            const chunkSize = Math.ceil(entries.length / chunks);

            console.log(`  Splitting ${cc} into ${chunks} parts...`);

            for (let i = 0; i < chunks; i++) {
                const chunk = entries.slice(i * chunkSize, (i + 1) * chunkSize);
                const chunkPath = path.join(OUTPUT_DIR, `${cc.toLowerCase()}-${i + 1}.json`);
                fs.writeFileSync(chunkPath, JSON.stringify(chunk));
            }
        } else {
            // Write single file
            const outputPath = path.join(OUTPUT_DIR, `${cc.toLowerCase()}.json`);
            fs.writeFileSync(outputPath, jsonStr);
        }

        const sizeKB = Math.round(jsonStr.length / 1024);
        console.log(`${entries.length} places (${sizeKB} KB) ${chunks > 1 ? `[${chunks} chunks]` : ''}`);

        index.countries.push({
            code: cc,
            count: entries.length,
            sizeKB,
            chunks
        });
        index.totalEntries += entries.length;
    }

    // Write index
    const indexPath = path.join(OUTPUT_DIR, '_index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

    console.log(`\n✅ Processed ${index.countries.length} countries`);
    console.log(`   Total: ${index.totalEntries} places`);
    console.log(`   Output: ${OUTPUT_DIR}`);
}

main().catch(console.error);
