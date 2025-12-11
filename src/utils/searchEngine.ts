// Search Engine powered by FlexSearch
// Provides ultra-fast, offline, fuzzy geography search

import FlexSearch from 'flexsearch';

// Types
export interface GeoLocation {
    id: string;
    name: string;
    nameAlt?: string;        // Alternative names (native/local)
    nameBg?: string;         // Bulgarian translation
    nameIt?: string;         // Italian translation
    alternateNames?: string[]; // All alternate names for multi-language search
    type: 'country' | 'capital' | 'city' | 'town' | 'village' | 'landmark';
    country?: string;
    countryCode?: string;
    lat: number;
    lng: number;
    population?: number;
    zoom: number;            // Suggested zoom level
}

export interface SearchResult extends GeoLocation {
    score: number;
    matchedField: string;
}

// FlexSearch Index with optimized configuration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let searchIndex: any = null;
let geoData: GeoLocation[] = [];
let indexToLocation: Map<number, number> = new Map(); // Maps FlexSearch index -> geoData index
let loadedIds: Set<string> = new Set();
let indexCounter = 0; // Global counter for incremental indexing
let isInitialized = false;
let isInitializing = false;
let initPromise: Promise<void> | null = null;
let loadedCountries: Set<string> = new Set();
let countryBboxes: Record<string, [number, number, number, number]> = {}; // [minLat, minLng, maxLat, maxLng]

// Convert compact GeoNames format to GeoLocation
// Entry format: { id, n (name), a (ascii), c (country), p (pop), lat, lng, alt (alternateNames array) }
function convertGeoNamesEntry(entry: { id: string; n: string; a?: string; c?: string; p: number; lat: number; lng: number; alt?: string[] }): GeoLocation {
    // Classify type based on population
    let type: GeoLocation['type'];
    if (entry.p >= 10000) {
        type = 'city';
    } else if (entry.p >= 1000) {
        type = 'town';
    } else {
        type = 'village';
    }

    return {
        id: `gn-${entry.id}`,
        name: entry.n,
        nameAlt: entry.a && entry.a !== entry.n ? entry.a : undefined,
        alternateNames: entry.alt,  // Multi-language names from GeoNames
        type,
        country: entry.c,
        countryCode: entry.c,
        lat: entry.lat,
        lng: entry.lng,
        population: entry.p,
        zoom: entry.p > 100000 ? 10 : entry.p > 10000 ? 12 : entry.p > 1000 ? 14 : 15
    };
}

// Helper: Index a list of locations
function indexLocations(locations: GeoLocation[]) {
    // Add to geoData array and index

    locations.forEach(loc => {
        // Deduplication: Skip if ID already loaded
        if (loadedIds.has(loc.id)) return;
        loadedIds.add(loc.id);

        geoData.push(loc);
        const locIdx = geoData.length - 1; // Correct index after push

        // Primary name
        searchIndex!.add(indexCounter, loc.name);
        indexToLocation.set(indexCounter++, locIdx);

        // ASCII/alternative name
        if (loc.nameAlt) {
            searchIndex!.add(indexCounter, loc.nameAlt);
            indexToLocation.set(indexCounter++, locIdx);
        }
        // Bulgarian name
        if (loc.nameBg) {
            searchIndex!.add(indexCounter, loc.nameBg);
            indexToLocation.set(indexCounter++, locIdx);
        }
        // Italian name
        if (loc.nameIt) {
            searchIndex!.add(indexCounter, loc.nameIt);
            indexToLocation.set(indexCounter++, locIdx);
        }
        // All alternate names from GeoNames (multi-language)
        if (loc.alternateNames) {
            loc.alternateNames.forEach(altName => {
                searchIndex!.add(indexCounter, altName);
                indexToLocation.set(indexCounter++, locIdx);
            });
        }
    });

    console.log(`[SearchEngine] Added ${locations.length} new locations (Total: ${geoData.length})`);
}

// Helper: Check viewport and load overlapped countries
export async function checkAndLoadCountries(centerLat: number, centerLng: number, zoom: number) {
    if (!isInitialized || isInitializing || zoom < 6) return; // Only load when zoomed in enough

    for (const [code, bbox] of Object.entries(countryBboxes)) {
        if (loadedCountries.has(code)) continue;

        // Check if map center is inside or close to bounding box
        if (centerLat >= bbox[0] && centerLat <= bbox[2] &&
            centerLng >= bbox[1] && centerLng <= bbox[3]) {

            console.log(`[SearchEngine] Viewport in ${code}, loading village data...`);
            loadedCountries.add(code); // Mark as loading immediately to prevent duplicate requests

            try {
                const response = await fetch(`/data/villages/${code.toLowerCase()}.json`);
                if (!response.ok) throw new Error('File not found');

                const rawData = await response.json();
                const locations = rawData.map(convertGeoNamesEntry);
                indexLocations(locations);
            } catch (e) {
                console.warn(`[SearchEngine] Failed to load data for ${code}:`, e);
                loadedCountries.delete(code); // Retry later if failed
            }
        }
    }
}

// Initialize the search engine
export async function initializeSearchEngine(): Promise<void> {
    if (isInitialized) return;
    if (isInitializing && initPromise) return initPromise;

    isInitializing = true;

    initPromise = (async () => {
        try {
            // Load country bounding boxes
            try {
                const bboxRes = await fetch('/data/villages/_bboxes.json');
                countryBboxes = await bboxRes.json();
            } catch (e) {
                console.warn('[SearchEngine] Could not load country bboxes used for dynamic loading');
            }

            // Create FlexSearch index with optimal settings
            searchIndex = new FlexSearch.Index({
                tokenize: 'forward',
                resolution: 9,
                cache: 100,
            });

            // Load base geography data (countries, capitals, landmarks)
            const baseResponse = await fetch('/data/geoData.json');
            const baseData: GeoLocation[] = await baseResponse.json();
            indexLocations(baseData);

            // Load major cities (pop > 10K) - this is the fast tier
            let majorCities: GeoLocation[] = [];
            try {
                const majorResponse = await fetch('/data/cities/major.json');
                const majorRaw = await majorResponse.json();
                majorCities = majorRaw.map(convertGeoNamesEntry);
                // Filter out major cities that are already in BG priority set?
                // Actually, just load them all, dedupe later if needed?
                // For simplicity, we just index everything.
                indexLocations(majorCities);
            } catch (e) {
                console.warn('[SearchEngine] Could not load major cities:', e);
            }

            // Load ALL Bulgarian places with alternate names
            let bgVillages: GeoLocation[] = [];
            try {
                const bgResponse = await fetch('/data/villages/bg.json');
                const bgRaw = await bgResponse.json();
                bgVillages = bgRaw.map(convertGeoNamesEntry);
                loadedCountries.add('BG');
                indexLocations(bgVillages);
            } catch (e) {
                console.warn('[SearchEngine] Could not load Bulgarian data:', e);
            }

            isInitialized = true;
            console.log(`[SearchEngine] Initialized with ${geoData.length} total locations`);
        } catch (error) {
            console.error('[SearchEngine] Failed to initialize:', error);
            isInitializing = false;
            throw error;
        }
    })();

    return initPromise;
}

// Search function with fuzzy matching and scoring
export function search(query: string, limit: number = 10): SearchResult[] {
    if (!isInitialized || !searchIndex || !query.trim()) {
        return [];
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Get results from FlexSearch
    const indices = searchIndex.search(normalizedQuery, { limit: limit * 2 });

    // Map indices to results with scoring
    const resultMap = new Map<string, SearchResult>();

    (indices as number[]).forEach((idx: number, rank: number) => {
        // Retrieve actual location using the index map
        const locIdx = indexToLocation.get(idx);
        if (locIdx === undefined) return;

        const loc = geoData[locIdx];

        if (!loc || resultMap.has(loc.id)) return;

        // Calculate score based on:
        // 1. Search rank (higher = better)
        // 2. Type priority (country > capital > city > landmark)
        // 3. Population (for cities)
        const typeScores: Record<GeoLocation['type'], number> = {
            country: 1000, capital: 800, city: 500, town: 400, village: 300, landmark: 350
        };
        const typeScore = typeScores[loc.type] || 0;
        const popScore = loc.population ? Math.log10(loc.population) * 10 : 0;
        const rankScore = (indices.length - rank) * 50;

        // Bonus for exact start match
        const exactStartBonus = loc.name.toLowerCase().startsWith(normalizedQuery) ? 500 : 0;

        const score = rankScore + typeScore + popScore + exactStartBonus;

        // Determine matched field
        let matchedField = 'name';
        if (loc.nameBg && loc.nameBg.toLowerCase().includes(normalizedQuery)) matchedField = 'nameBg';
        else if (loc.nameIt && loc.nameIt.toLowerCase().includes(normalizedQuery)) matchedField = 'nameIt';
        else if (loc.nameAlt && loc.nameAlt.toLowerCase().includes(normalizedQuery)) matchedField = 'nameAlt';
        else if (loc.alternateNames?.some(an => an.toLowerCase().includes(normalizedQuery))) matchedField = 'nameAlt';

        resultMap.set(loc.id, {
            ...loc,
            score,
            matchedField
        });
    });

    // Sort by score and return top results
    return Array.from(resultMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

// Fuzzy search with typo tolerance (for more aggressive matching)
export function fuzzySearch(query: string, limit: number = 10): SearchResult[] {
    if (!isInitialized || !geoData.length || !query.trim()) {
        return [];
    }

    const normalizedQuery = query.toLowerCase().trim();

    // First try exact FlexSearch
    let results = search(query, limit);

    // If few results, fall back to manual fuzzy matching
    if (results.length < 3 && normalizedQuery.length >= 2) {
        const fuzzyResults: SearchResult[] = [];

        for (const loc of geoData) {
            const name = loc.name.toLowerCase();
            const nameAlt = loc.nameAlt?.toLowerCase() || '';

            // Levenshtein-like quick check: allow 1-2 char difference for short queries
            const maxDist = normalizedQuery.length <= 4 ? 1 : 2;

            if (fuzzyMatch(normalizedQuery, name, maxDist) ||
                fuzzyMatch(normalizedQuery, nameAlt, maxDist)) {
                const typeScores: Record<GeoLocation['type'], number> = {
                    country: 1000, capital: 800, city: 500, town: 400, village: 300, landmark: 350
                };
                fuzzyResults.push({
                    ...loc,
                    score: typeScores[loc.type] + (loc.population ? Math.log10(loc.population) : 0),
                    matchedField: 'name'
                });
            }

            if (fuzzyResults.length >= limit * 2) break;
        }

        // Merge with existing results
        const ids = new Set(results.map(r => r.id));
        fuzzyResults.forEach(r => {
            if (!ids.has(r.id)) {
                results.push(r);
            }
        });

        results = results.slice(0, limit);
    }

    return results;
}

// Simple fuzzy match helper (substring + prefix matching)
function fuzzyMatch(query: string, target: string, maxDist: number): boolean {
    if (!target) return false;
    if (target.includes(query)) return true;
    if (target.startsWith(query.slice(0, -1))) return true;

    // Very basic edit distance check for first few chars
    if (query.length <= 3 && target.length >= query.length) {
        let mismatches = 0;
        for (let i = 0; i < query.length && i < target.length; i++) {
            if (query[i] !== target[i]) mismatches++;
            if (mismatches > maxDist) return false;
        }
        return mismatches <= maxDist;
    }

    return false;
}

// Get status of search engine
export function getSearchStatus(): { initialized: boolean; locationCount: number } {
    return {
        initialized: isInitialized,
        locationCount: geoData.length
    };
}

// Cleanup function
export function destroySearchEngine(): void {
    searchIndex = null;
    geoData = [];
    indexToLocation.clear();
    loadedIds.clear();
    indexCounter = 0;
    isInitialized = false;
    isInitializing = false;
    initPromise = null;
    loadedCountries.clear();
}
