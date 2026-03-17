/**
 * Download and process FULL Bulgarian GeoNames data
 * This includes ALL villages, not just cities > 500
 * 
 * Run with: node scripts/processFullBulgaria.cjs
 */

const fs = require('fs');
const path = require('path');
const { downloadFile } = require('./utils/secureDownload.cjs');
const { extractZip } = require('./utils/secureZip.cjs');
const readline = require('readline');

const BG_URL = 'https://download.geonames.org/export/dump/BG.zip';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data', 'cities');
const TEMP_DIR = path.join(__dirname, '..', 'temp');

// GeoNames TSV column indices
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

function parseGeoNamesLine(line) {
    const fields = line.split('\t');
    if (fields.length < 18) return null;

    const featureClass = fields[COLS.featureClass];
    // Only include populated places (P) and some administrative (A)
    if (featureClass !== 'P' && featureClass !== 'A') return null;

    const lat = parseFloat(fields[COLS.latitude]);
    const lng = parseFloat(fields[COLS.longitude]);
    if (isNaN(lat) || isNaN(lng)) return null;

    const pop = parseInt(fields[COLS.population]) || 0;
    const name = fields[COLS.name];
    const asciiname = fields[COLS.asciiname];

    return {
        id: fields[COLS.geonameid],
        n: name,
        a: asciiname !== name ? asciiname : undefined,
        c: 'BG',
        p: pop,
        lat: Math.round(lat * 100000) / 100000,
        lng: Math.round(lng * 100000) / 100000,
        fc: fields[COLS.featureCode]
    };
}

async function processBGFile(filePath) {
    console.log(`Processing ${filePath}...`);

    const entries = [];
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
        const entry = parseGeoNamesLine(line);
        if (entry) entries.push(entry);
    }

    // Sort by population (largest first)
    entries.sort((a, b) => b.p - a.p);

    console.log(`Found ${entries.length} populated places in Bulgaria`);
    return entries;
}

async function main() {
    try {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });

        const zipPath = path.join(TEMP_DIR, 'BG.zip');
        const txtPath = path.join(TEMP_DIR, 'BG.txt');

        // Download if not exists
        if (!fs.existsSync(txtPath)) {
            if (!fs.existsSync(zipPath)) {
                await downloadFile(BG_URL, zipPath);
            }
            await extractZip(zipPath, TEMP_DIR);
        }

        // Process the file
        const entries = await processBGFile(txtPath);

        // Write output
        const outputPath = path.join(OUTPUT_DIR, 'bg-full.json');
        fs.writeFileSync(outputPath, JSON.stringify(entries));

        const sizeKB = Math.round(fs.statSync(outputPath).size / 1024);
        console.log(`\n✅ Wrote ${entries.length} Bulgarian places to bg-full.json (${sizeKB} KB)`);

        // Show breakdown
        const cities = entries.filter(e => e.p > 10000).length;
        const towns = entries.filter(e => e.p > 1000 && e.p <= 10000).length;
        const villages = entries.filter(e => e.p <= 1000).length;
        console.log(`   Cities (>10K): ${cities}`);
        console.log(`   Towns (1K-10K): ${towns}`);
        console.log(`   Villages (<1K): ${villages}`);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
