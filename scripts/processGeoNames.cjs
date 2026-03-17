/**
 * GeoNames Data Processor
 * Downloads and processes cities500.zip to create optimized JSON files
 * 
 * Run with: node scripts/processGeoNames.js
 */

const fs = require('fs');
const path = require('path');
const { downloadFile } = require('./utils/secureDownload.cjs');
const { extractZip } = require('./utils/secureZip.cjs');
const { createUnzip } = require('zlib');
const { pipeline } = require('stream/promises');
const readline = require('readline');

const GEONAMES_URL = 'https://download.geonames.org/export/dump/cities500.zip';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data', 'cities');
const TEMP_DIR = path.join(__dirname, '..', 'temp');

// Priority countries (Bulgarian school focus)
const PRIORITY_COUNTRIES = ['BG', 'IT', 'DE', 'FR', 'GB', 'ES', 'GR', 'RO', 'RS', 'MK', 'TR'];

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
    elevation: 15,
    timezone: 17
};

function parseGeoNamesLine(line) {
    const fields = line.split('\t');
    if (fields.length < 18) return null;

    const pop = parseInt(fields[COLS.population]) || 0;
    const lat = parseFloat(fields[COLS.latitude]);
    const lng = parseFloat(fields[COLS.longitude]);

    if (isNaN(lat) || isNaN(lng)) return null;

    return {
        id: fields[COLS.geonameid],
        n: fields[COLS.name],              // name (UTF8)
        a: fields[COLS.asciiname],         // ASCII name
        c: fields[COLS.countryCode],       // country code
        p: pop,                            // population
        lat: Math.round(lat * 100000) / 100000,  // 5 decimal precision
        lng: Math.round(lng * 100000) / 100000,
        fc: fields[COLS.featureCode]       // feature code (PPL, PPLA, etc.)
    };
}

async function processGeoNamesFile(filePath) {
    console.log(`Processing ${filePath}...`);

    const countryData = {};
    const majorCities = [];  // Cities with pop > 10000

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let count = 0;
    for await (const line of rl) {
        const entry = parseGeoNamesLine(line);
        if (!entry) continue;

        count++;

        // Add to country-specific file
        if (!countryData[entry.c]) {
            countryData[entry.c] = [];
        }
        countryData[entry.c].push(entry);

        // Add to major cities if pop > 10000
        if (entry.p > 10000) {
            majorCities.push(entry);
        }
    }

    console.log(`Processed ${count} entries`);
    return { countryData, majorCities };
}

async function writeOutputFiles(countryData, majorCities) {
    // Ensure output directory exists
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Write major cities
    const majorPath = path.join(OUTPUT_DIR, 'major.json');
    fs.writeFileSync(majorPath, JSON.stringify(majorCities));
    console.log(`Wrote ${majorCities.length} major cities to major.json`);

    // Write country files (priority countries first)
    const index = { countries: [], totalEntries: 0 };

    for (const [countryCode, entries] of Object.entries(countryData)) {
        const filePath = path.join(OUTPUT_DIR, `${countryCode.toLowerCase()}.json`);
        fs.writeFileSync(filePath, JSON.stringify(entries));

        index.countries.push({
            code: countryCode,
            count: entries.length,
            priority: PRIORITY_COUNTRIES.includes(countryCode)
        });
        index.totalEntries += entries.length;

        console.log(`Wrote ${entries.length} entries for ${countryCode}`);
    }

    // Sort index by priority then count
    index.countries.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return b.count - a.count;
    });

    // Write index file
    const indexPath = path.join(OUTPUT_DIR, '_index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log(`Wrote index with ${index.countries.length} countries`);
}

async function main() {
    try {
        // Create temp directory
        fs.mkdirSync(TEMP_DIR, { recursive: true });

        const zipPath = path.join(TEMP_DIR, 'cities500.zip');
        const txtPath = path.join(TEMP_DIR, 'cities500.txt');

        // Download if not exists
        if (!fs.existsSync(txtPath)) {
            if (!fs.existsSync(zipPath)) {
                await downloadFile(GEONAMES_URL, zipPath);
            }
            await extractZip(zipPath, TEMP_DIR);
        }

        // Process the file
        const { countryData, majorCities } = await processGeoNamesFile(txtPath);

        // Write output files
        await writeOutputFiles(countryData, majorCities);

        console.log('\n✅ GeoNames processing complete!');
        console.log(`Output directory: ${OUTPUT_DIR}`);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
