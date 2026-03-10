import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapContainer.css';
import './Popup.css';
import { MAP_STYLES, type MapStyleId } from './mapStyles';
import { point, lineString, length } from '@turf/turf';
import type { Language } from '../UI/Overlay';
import { translations } from '../../utils/translations';
import { checkAndLoadCountries } from '../../utils/searchEngine';

// Vector Label Layer Configuration - Single source of truth for all label types
const VECTOR_LABEL_LAYERS = [
    // Water name labels (ocean and sea) - uses 'water_name' source-layer
    {
        id: 'vector-labels-ocean',
        class: 'ocean',
        sourceLayer: 'water_name',
        minzoom: undefined,
        maxzoom: 6,
        fontSize: ['interpolate', ['linear'], ['zoom'], 1, 14, 4, 20] as any,
        font: 'Noto Sans Italic',
        textTransform: 'uppercase' as const,
        letterSpacing: 0.3,
        haloWidth: 2,
        opacity: 0.8,
        textColor: '#4a90d9' // Blue text for water bodies
    },
    {
        id: 'vector-labels-sea',
        class: 'sea',
        sourceLayer: 'water_name',
        minzoom: 3,
        maxzoom: undefined,
        fontSize: ['interpolate', ['linear'], ['zoom'], 3, 11, 6, 16] as any,
        font: 'Noto Sans Italic',
        textTransform: undefined,
        letterSpacing: 0.15,
        haloWidth: 1.5,
        opacity: 0.8,
        textColor: '#4a90d9' // Blue text for water bodies
    },
    {
        id: 'vector-labels-continent',
        class: 'continent',
        minzoom: undefined,
        maxzoom: 4,
        fontSize: 18,
        font: 'Noto Sans Bold',
        textTransform: 'uppercase' as const,
        letterSpacing: 0.2,
        haloWidth: 2,
        opacity: ['interpolate', ['linear'], ['zoom'], 1, 1, 4, 0] as any
    },
    {
        id: 'vector-labels-country',
        class: 'country',
        minzoom: 2,
        maxzoom: undefined,
        fontSize: ['interpolate', ['linear'], ['zoom'], 2, 10, 6, 14] as any,
        font: 'Noto Sans Regular',
        textTransform: 'uppercase' as const,
        letterSpacing: 0.1,
        haloWidth: 2,
        opacity: undefined
    },
    {
        id: 'vector-labels-state',
        class: 'state',
        minzoom: 4,
        maxzoom: undefined,
        fontSize: 12,
        font: 'Noto Sans Regular',
        textTransform: undefined,
        letterSpacing: undefined,
        haloWidth: 1.5,
        opacity: 0.8
    },
    {
        id: 'vector-labels-city',
        class: 'city',
        minzoom: 9,
        maxzoom: undefined,
        fontSize: ['interpolate', ['linear'], ['zoom'], 7, 10, 12, 16] as any,
        font: 'Noto Sans Regular',
        textTransform: undefined,
        letterSpacing: undefined,
        haloWidth: 1.5,
        opacity: undefined
    },
    {
        id: 'vector-labels-town',
        class: 'town',
        minzoom: 11,
        maxzoom: undefined,
        fontSize: 11,
        font: 'Noto Sans Regular',
        textTransform: undefined,
        letterSpacing: undefined,
        haloWidth: 1,
        opacity: undefined
    },
    {
        id: 'vector-labels-village',
        class: 'village',
        minzoom: 13,
        maxzoom: undefined,
        fontSize: 10,
        font: 'Noto Sans Regular',
        textTransform: undefined,
        letterSpacing: undefined,
        haloWidth: 1,
        opacity: 0.9
    }
];

// Pre-calculate IDs to avoid allocation in updateLanguage
const VECTOR_LABEL_LAYER_IDS = VECTOR_LABEL_LAYERS.map(layer => layer.id);

// Helper to add all vector label layers
const addVectorLabelLayers = (
    mapInstance: maplibregl.Map,
    sourceId: string,
    langField: string,
    textColor: string,
    haloColor: string
) => {
    VECTOR_LABEL_LAYERS.forEach(layer => {
        if (mapInstance.getLayer(layer.id)) return; // Skip if already exists

        const layoutProps: any = {
            'text-field': ['coalesce', ['get', langField], ['get', 'name:en'], ['get', 'name']],
            'text-size': layer.fontSize,
            'text-font': [layer.font]
        };
        if (layer.textTransform) layoutProps['text-transform'] = layer.textTransform;
        if (layer.letterSpacing !== undefined) layoutProps['text-letter-spacing'] = layer.letterSpacing;

        // Use layer-specific text color if defined (e.g., blue for oceans), otherwise use default
        const layerTextColor = (layer as any).textColor || textColor;

        const paintProps: any = {
            'text-color': layerTextColor,
            'text-halo-color': haloColor,
            'text-halo-width': layer.haloWidth
        };
        if (layer.opacity !== undefined) paintProps['text-opacity'] = layer.opacity;

        // Use layer-specific source-layer if defined (water_name for oceans), otherwise default to 'place'
        const sourceLayer = (layer as any).sourceLayer || 'place';

        const layerDef: any = {
            id: layer.id,
            type: 'symbol',
            source: sourceId,
            'source-layer': sourceLayer,
            filter: ['==', 'class', layer.class],
            layout: layoutProps,
            paint: paintProps
        };
        if (layer.minzoom !== undefined) layerDef.minzoom = layer.minzoom;
        if (layer.maxzoom !== undefined) layerDef.maxzoom = layer.maxzoom;

        mapInstance.addLayer(layerDef);
    });
};

export interface MapContainerProps {
    onMeasure: (measurement: string) => void;
    activeLayer: MapStyleId;
    showGraticules: boolean;
    showLabels: boolean;
    showBorders: boolean;
    selectedAdminCountry: string | null;

    currentLang: Language;
    onCoordinatesChange: (coords: { lat: number; lng: number; zoom: number } | null) => void;
    activeToolRef: React.MutableRefObject<string | null>;
    onToolChangeRef: React.MutableRefObject<(tool: string | null) => void>;
}

export interface MapRef {
    flyToLocation: (center: [number, number], zoom: number, bbox?: [number, number, number, number], name?: string) => void;
    setTool: (tool: string) => void;
    clearMeasurement: () => void;
    getMap: () => maplibregl.Map | null;
    locateMe: () => void;
}

const MapContainer = forwardRef<MapRef, MapContainerProps>(({
    onMeasure,
    activeLayer,
    showGraticules,
    showLabels,
    showBorders,
    selectedAdminCountry,

    currentLang,
    onCoordinatesChange,
    activeToolRef,
    onToolChangeRef
}, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const lastActiveLayer = useRef<MapStyleId | null>(null); // Initialize as null to force first update
    const markers = useRef<maplibregl.Marker[]>([]);
    const markerCleanups = useRef<(() => void)[]>([]); // Store cleanup functions for markers

    // Ruler State
    const rulerState = useRef<{ active: boolean; points: number[][]; tempPoint: number[] | null }>({
        active: false,
        points: [],
        tempPoint: null
    });

    // Throttling State
    const coordTimeout = useRef<number | null>(null);
    const lastCoords = useRef<{ lat: number; lng: number; zoom: number } | null>(null);

    // Helper to update ruler layer
    const updateRulerLayer = () => {
        if (!map.current || !map.current.getSource('ruler-source')) return;

        const source = map.current.getSource('ruler-source') as maplibregl.GeoJSONSource;
        const features: any[] = [];

        if (rulerState.current.points.length > 0) {
            // Points
            rulerState.current.points.forEach(pt => {
                features.push(point(pt));
            });

            // Line
            if (rulerState.current.points.length > 1) {
                features.push(lineString(rulerState.current.points));
            }

            // Temp Line (rubber band)
            if (rulerState.current.tempPoint && rulerState.current.points.length > 0) {
                const lastPoint = rulerState.current.points[rulerState.current.points.length - 1];
                features.push(lineString([lastPoint, rulerState.current.tempPoint]));
            }
        }

        source.setData({ type: 'FeatureCollection', features });
    };

    // Helper to set active tool
    const setActiveTool = (tool: string | null) => {
        if (!map.current || !mapContainer.current) return;

        // Reset previous state
        rulerState.current = { active: false, points: [], tempPoint: null };
        updateRulerLayer();
        map.current.getCanvas().style.cursor = '';
        mapContainer.current.classList.remove('tool-draw', 'tool-measure', 'tool-marker');

        if (tool === 'measure-distance') {
            rulerState.current.active = true;
            map.current.getCanvas().style.cursor = 'crosshair';
            mapContainer.current.classList.add('tool-measure');
        } else if (tool === 'marker') {
            map.current.getCanvas().style.cursor = 'pointer';
            mapContainer.current.classList.add('tool-marker');
        }
    };

    useImperativeHandle(ref, () => ({
        flyToLocation: (center, zoom, bbox, name) => {
            if (bbox) {
                map.current?.fitBounds(bbox as [number, number, number, number], { padding: 50 });
            } else {
                map.current?.flyTo({ center, zoom });

                // Smart Snap: If name is provided, try to snap to the exact label position after arrival
                if (name && map.current) {
                    const snapToLabel = () => {
                        const mapInstance = map.current;
                        if (!mapInstance) return;

                        // Project center to pixels to define a search window
                        // We search a generous area as label might be offset from center
                        const point = mapInstance.project(center as [number, number]); // center is [lng, lat]
                        const searchBox: [maplibregl.PointLike, maplibregl.PointLike] = [
                            [point.x - 100, point.y - 100],
                            [point.x + 100, point.y + 100]
                        ];

                        const features = mapInstance.queryRenderedFeatures(searchBox, {
                            layers: [
                                'vector-labels-city',
                                'vector-labels-town',
                                'vector-labels-village',
                                'vector-labels-capital' // If exists
                            ]
                        });

                        const targetName = name.toLowerCase();

                        // Find a feature that matches the name
                        const match = features.find(f => {
                            const p = f.properties || {};
                            return (p.name && p.name.toLowerCase() === targetName) ||
                                (p['name:en'] && p['name:en'].toLowerCase() === targetName) ||
                                (p['name:bg'] && p['name:bg'].toLowerCase() === targetName) ||
                                (p['name:it'] && p['name:it'].toLowerCase() === targetName);
                        });

                        if (match && match.geometry.type === 'Point') {
                            const coords = (match.geometry as any).coordinates; // [lng, lat]
                            // Gently ease to the REAL label position
                            mapInstance.easeTo({ center: coords as [number, number], duration: 600, easing: (t) => t * (2 - t) });
                        }
                    };

                    // Execute snap after move ends (flight completes)
                    map.current.once('moveend', snapToLabel);
                }
            }
        },
        setTool: (tool) => {
            setActiveTool(tool === 'none' ? null : tool);
        },
        clearMeasurement: () => {
            rulerState.current = { active: false, points: [], tempPoint: null };
            updateRulerLayer();
            setActiveTool(null);
            onToolChangeRef.current(null);
        },
        getMap: () => map.current,
        locateMe: () => {
            if (!map.current) return;
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        map.current?.flyTo({
                            center: [longitude, latitude],
                            zoom: 14,
                            essential: true
                        });

                        // Add a minimalistic blue dot marker
                        const bluePin = document.createElement('div');
                        bluePin.style.cssText = 'width: 14px; height: 14px; background: #3b82f6; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(59,130,246,0.4);';
                        new maplibregl.Marker({ element: bluePin, anchor: 'center' })
                            .setLngLat([longitude, latitude])
                            .addTo(map.current!);
                    },
                    (error) => {
                        console.error("Geolocation error:", error);
                        alert("Could not get your location.");
                    }
                );
            } else {
                alert("Geolocation is not supported by this browser.");
            }
        }
    }));

    // Initialize Map
    useEffect(() => {
        if (map.current) return; // Initialize only once

        if (!mapContainer.current) {
            console.error("Map container ref is null");
            return;
        }

        try {
            // Initialize with style that includes glyphs for vector label fonts
            const initialStyle = {
                version: 8,
                sources: {},
                layers: [],
                glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'
            };

            map.current = new maplibregl.Map({
                container: mapContainer.current,
                style: initialStyle as any, // Cast to any to avoid type complaints with empty style
                center: [20, 50], // Europe centered
                zoom: 3.5,
                maxZoom: 18,
                attributionControl: false,
                preserveDrawingBuffer: true,
                trackResize: true
            });

            map.current.on('load', () => {
                console.log("Map Loaded Successfully");
                setIsMapLoaded(true);

                if (!map.current) return;

                // Initialize Slot Architecture
                const slots = ['slot-base', 'slot-data', 'slot-roads', 'slot-ui'];
                slots.forEach(slotId => {
                    if (!map.current?.getLayer(slotId)) {
                        map.current?.addLayer({
                            id: slotId,
                            type: 'background',
                            paint: { 'background-color': 'rgba(0,0,0,0)' }
                        });
                    }
                });

                // Initialize Ruler Source/Layers
                map.current.addSource('ruler-source', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });

                map.current.addLayer({
                    id: 'ruler-line',
                    type: 'line',
                    source: 'ruler-source',
                    paint: {
                        'line-color': '#3b82f6',
                        'line-width': 3,
                        'line-dasharray': [2, 1]
                    },
                    filter: ['==', '$type', 'LineString']
                });

                map.current.addLayer({
                    id: 'ruler-points',
                    type: 'circle',
                    source: 'ruler-source',
                    paint: {
                        'circle-radius': 5,
                        'circle-color': '#3b82f6',
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ffffff'
                    },
                    filter: ['==', '$type', 'Point']
                });
            });

            map.current.on('error', (e) => {
                console.error("MapLibre Error:", e);
            });

            // Click Handler
            map.current.on('click', (e) => {
                if (!map.current) return;

                if (rulerState.current.active) {
                    rulerState.current.points.push([e.lngLat.lng, e.lngLat.lat]);
                    updateRulerLayer();

                    if (rulerState.current.points.length > 1) {
                        const line = lineString(rulerState.current.points);
                        const distance = length(line, { units: 'kilometers' });
                        onMeasure(`${distance.toLocaleString(undefined, { maximumFractionDigits: 2 })} km`);

                        // Stop measuring after 2 points
                        rulerState.current.active = false;
                        map.current.getCanvas().style.cursor = '';
                        if (mapContainer.current) {
                            mapContainer.current.classList.remove('tool-measure');
                        }
                        activeToolRef.current = null;
                        onToolChangeRef.current(null);
                    }
                    return;
                }

                if (activeToolRef.current === 'marker') {
                    // Create minimalistic red pin (no transition to prevent wiggle during pan)
                    const redPin = document.createElement('div');
                    redPin.className = 'custom-map-pin';
                    redPin.style.cssText = 'width: 14px; height: 14px; background: #ef4444; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(239,68,68,0.4); cursor: pointer;';
                    const marker = new maplibregl.Marker({ element: redPin, anchor: 'center' })
                        .setLngLat(e.lngLat)
                        .addTo(map.current);

                    // Calculate tile coordinates for zoom level 15
                    const n = Math.pow(2, 15);
                    const xTile = Math.floor(n * ((e.lngLat.lng + 180) / 360));
                    const latRad = e.lngLat.lat * Math.PI / 180;
                    const yTile = Math.floor(n * (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2);

                    // Esri World Imagery Tile URL (Free)
                    const tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/15/${yTile}/${xTile}`;

                    const t = translations[currentLang].marker;

                    const popupContent = document.createElement('div');
                    popupContent.className = 'glass-popup-content';

                    // Use static HTML to prevent XSS, then populate dynamic content via DOM properties
                    popupContent.innerHTML = `
                        <div class="popup-header">
                            <div class="popup-tag-dot"></div>
                            <span class="popup-title" id="popup-title"></span>
                        </div>
                        
                        <div class="popup-preview">
                            <img id="popup-preview-img" alt="Satellite Preview" />
                        </div>

                        <div class="popup-coords">
                            <div id="popup-coord-lat"></div>
                            <div id="popup-coord-lng"></div>
                        </div>

                        <div class="popup-actions">
                            <a id="popup-google-maps-link" target="_blank" rel="noopener noreferrer" class="popup-btn-primary">
                                <span id="popup-google-maps-text"></span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                            
                            <button id="remove-marker-btn" class="popup-btn-danger"></button>
                        </div>
                    `;

                    // Safely inject dynamic content
                    const titleEl = popupContent.querySelector('#popup-title');
                    if (titleEl) titleEl.textContent = t.selectedLocation;

                    const imgEl = popupContent.querySelector('#popup-preview-img') as HTMLImageElement;
                    if (imgEl) imgEl.src = tileUrl;

                    const latEl = popupContent.querySelector('#popup-coord-lat');
                    if (latEl) latEl.textContent = `${t.lat}: ${e.lngLat.lat.toFixed(5)}`;

                    const lngEl = popupContent.querySelector('#popup-coord-lng');
                    if (lngEl) lngEl.textContent = `${t.lng}: ${e.lngLat.lng.toFixed(5)}`;

                    const mapsLinkEl = popupContent.querySelector('#popup-google-maps-link') as HTMLAnchorElement;
                    if (mapsLinkEl) mapsLinkEl.href = `https://www.google.com/maps?q=${e.lngLat.lat},${e.lngLat.lng}`;

                    const mapsTextEl = popupContent.querySelector('#popup-google-maps-text');
                    if (mapsTextEl) mapsTextEl.textContent = t.openInGoogleMaps;

                    const removeBtnEl = popupContent.querySelector('#remove-marker-btn');
                    if (removeBtnEl) removeBtnEl.textContent = t.removeMarker;

                    // Create popup without binding to marker - gives us full control
                    const popup = new maplibregl.Popup({ offset: 25, closeButton: false, closeOnClick: false })
                        .setDOMContent(popupContent)
                        .setLngLat(e.lngLat)
                        .addTo(map.current);

                    markers.current.push(marker);

                    // Track popup state
                    let isOpen = true;
                    let isAnimating = false;

                    // Helper function to close popup with animation
                    const closePopupWithAnimation = () => {
                        if (!isOpen || isAnimating) return;
                        isAnimating = true;
                        popupContent.classList.add('popup-closing');
                        setTimeout(() => {
                            popup.remove();
                            isOpen = false;
                            isAnimating = false;
                        }, 200);
                    };

                    // Handle marker click - toggle popup with animation
                    redPin.addEventListener('click', (evt) => {
                        evt.stopPropagation();
                        if (isOpen) {
                            closePopupWithAnimation();
                        } else if (!isAnimating) {
                            popupContent.classList.remove('popup-closing');
                            popup.setLngLat(marker.getLngLat()).addTo(map.current!);
                            isOpen = true;
                        }
                    });

                    // Handle map click - close popup with animation
                    const mapClickHandler = (clickEvent: maplibregl.MapMouseEvent) => {
                        // Check if click is not on the popup or marker
                        const popupEl = popup.getElement();
                        const target = clickEvent.originalEvent.target as Element;
                        if (popupEl && !popupEl.contains(target) && !redPin.contains(target)) {
                            closePopupWithAnimation();
                        }
                    };
                    map.current.on('click', mapClickHandler);

                    // Store cleanup function for this marker
                    const cleanupMarker = () => {
                        map.current?.off('click', mapClickHandler);
                        popup.remove();
                    };
                    markerCleanups.current.push(cleanupMarker);

                    // Update remove button handler to also use animation
                    const removeBtn = popupContent.querySelector('#remove-marker-btn');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', () => {
                            popupContent.classList.add('popup-closing');
                            setTimeout(() => {
                                popup.remove();
                                marker.remove();
                                markers.current = markers.current.filter(m => m !== marker);
                                // Remove cleanup function from array
                                const idx = markerCleanups.current.indexOf(cleanupMarker);
                                if (idx > -1) markerCleanups.current.splice(idx, 1);
                                // Call cleanup to remove event listeners
                                map.current?.off('click', mapClickHandler);
                            }, 200);
                        });
                    }

                    // Reset tool
                    setActiveTool(null);
                    activeToolRef.current = null;
                    onToolChangeRef.current(null);
                }
            });

            // Mouse Move
            map.current.on('moveend', () => {
                if (map.current) {
                    const center = map.current.getCenter();
                    const zoom = map.current.getZoom();
                    checkAndLoadCountries(center.lat, center.lng, zoom);

                    if (onCoordinatesChange) {
                        onCoordinatesChange({ lat: center.lat, lng: center.lng, zoom });
                    }
                }
            });

            // ⚡ Bolt: Throttled coordinate updates
            // What: Throttle map 'move' and 'mousemove' events to ~20fps (50ms).
            // Why: Prevents excessive React re-renders in <App> and <Overlay> during continuous map panning.
            // Impact: Significantly reduces main thread blocking and memory allocation during map interaction.
            // Measurement: Use React Profiler to verify <Overlay> re-renders are limited to ~20fps during rapid map movement instead of matching the screen refresh rate (60-120fps).
            const handleCoordinateUpdate = (coords: { lat: number; lng: number; zoom: number }) => {
                lastCoords.current = coords;
                if (coordTimeout.current === null && onCoordinatesChange) {
                    onCoordinatesChange(coords);
                    coordTimeout.current = window.setTimeout(() => {
                        coordTimeout.current = null;
                        if (lastCoords.current && onCoordinatesChange) {
                            // Only fire trailing edge if coords actually changed to prevent duplicate state updates
                            if (lastCoords.current.lat !== coords.lat || lastCoords.current.lng !== coords.lng || lastCoords.current.zoom !== coords.zoom) {
                                onCoordinatesChange(lastCoords.current);
                            }
                        }
                    }, 50);
                }
            };

            map.current.on('move', () => {
                if (map.current) {
                    const center = map.current.getCenter();
                    const zoom = map.current.getZoom();
                    handleCoordinateUpdate({ lat: center.lat, lng: center.lng, zoom });
                }
            });

            map.current.on('mousemove', (e) => {
                if (map.current) {
                    const zoom = map.current.getZoom();
                    handleCoordinateUpdate({ lat: e.lngLat.lat, lng: e.lngLat.lng, zoom });
                }

                // Ruler Logic
                if (rulerState.current.active && rulerState.current.points.length > 0) {
                    rulerState.current.tempPoint = [e.lngLat.lng, e.lngLat.lat];
                    updateRulerLayer();

                    // Live distance update
                    const line = lineString([rulerState.current.points[0], rulerState.current.tempPoint]);
                    const distance = length(line, { units: 'kilometers' });
                    onMeasure(`${distance.toLocaleString(undefined, { maximumFractionDigits: 2 })} km`);
                }
            });

            // Removed mouseout handler - it was causing coordinates to disappear
            // when hovering over UI elements positioned over the map

        } catch (error) {
            console.error("Error initializing map:", error);
        }

        return () => {
            // Clean up all marker event listeners
            markerCleanups.current.forEach(cleanup => cleanup());
            markerCleanups.current = [];

            // Remove all markers
            markers.current.forEach(marker => marker.remove());
            markers.current = [];

            // Remove map
            map.current?.remove();

            if (coordTimeout.current !== null) {
                window.clearTimeout(coordTimeout.current);
                coordTimeout.current = null;
            }
        };
    }, []);

    // Helper: Update Language on Vector Labels
    const updateLanguage = useCallback(() => {
        if (!map.current) return;

        // Map language codes to OSM name fields
        const langField = currentLang === 'en' ? 'name:en' :
            currentLang === 'bg' ? 'name:bg' :
                currentLang === 'it' ? 'name:it' : 'name';

        // Update all vector label layers
        VECTOR_LABEL_LAYER_IDS.forEach(layerId => {
            if (map.current?.getLayer(layerId)) {
                try {
                    map.current.setLayoutProperty(layerId, 'text-field', [
                        'coalesce',
                        ['get', langField],
                        ['get', 'name:en'],
                        ['get', 'name']
                    ]);
                } catch (e) {
                    console.warn(`Could not update language for layer ${layerId}`, e);
                }
            }
        });

        // Also update any existing style layers that have text-field
        const style = map.current.getStyle();
        if (style?.layers) {
            style.layers.forEach(layer => {
                if (layer.type === 'symbol' && layer.layout?.['text-field'] && !VECTOR_LABEL_LAYER_IDS.includes(layer.id)) {
                    try {
                        map.current?.setLayoutProperty(layer.id, 'text-field', [
                            'coalesce',
                            ['get', langField],
                            ['get', 'name:en'],
                            ['get', 'name']
                        ]);
                    } catch { /* ignore */ }
                }
            });
        }
    }, [currentLang]);

    // Handle Style Changes & Toggles
    useEffect(() => {
        if (!map.current || !isMapLoaded) return;

        const initSlots = () => {
            if (!map.current) return;
            // Order matters: base -> data -> overlays -> labels (on top)
            const slots = ['slot-base', 'slot-data', 'slot-overlays', 'slot-labels'];
            slots.forEach(slotId => {
                if (!map.current?.getLayer(slotId)) {
                    map.current?.addLayer({
                        id: slotId,
                        type: 'background',
                        paint: { 'background-color': 'rgba(0,0,0,0)' }
                    });
                }
            });
        };

        const updateOverlays = () => {
            if (!map.current) return;
            initSlots();

            // Graticules
            const graticulesSourceId = 'graticules-source';
            const graticulesLayerId = 'graticules-layer';
            const graticulesLabelLayerId = 'graticules-labels';

            if (map.current.getSource(graticulesSourceId)) {
                if (map.current.getLayer(graticulesLabelLayerId)) map.current.removeLayer(graticulesLabelLayerId);
                if (map.current.getLayer(graticulesLayerId)) map.current.removeLayer(graticulesLayerId);
                map.current.removeSource(graticulesSourceId);
            }

            if (showGraticules) {
                const features: any[] = [];
                for (let lng = -180; lng <= 180; lng += 10) {
                    features.push({
                        type: 'Feature',
                        properties: { value: `${lng}°` },
                        geometry: { type: 'LineString', coordinates: [[lng, -90], [lng, 90]] }
                    });
                }
                for (let lat = -80; lat <= 80; lat += 10) {
                    features.push({
                        type: 'Feature',
                        properties: { value: `${lat}°` },
                        geometry: { type: 'LineString', coordinates: [[-180, lat], [180, lat]] }
                    });
                }

                map.current.addSource(graticulesSourceId, {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features }
                });

                map.current.addLayer({
                    id: graticulesLayerId,
                    type: 'line',
                    source: graticulesSourceId,
                    paint: { 'line-color': '#000000', 'line-opacity': 0.3, 'line-width': 1 }
                });

                map.current.addLayer({
                    id: graticulesLabelLayerId,
                    type: 'symbol',
                    source: graticulesSourceId,
                    layout: {
                        'symbol-placement': 'line',
                        'text-field': ['get', 'value'],
                        'text-size': 10,
                        'text-offset': [0, 1],
                        'text-font': ['Noto Sans Regular']
                    },
                    paint: { 'text-color': '#000000', 'text-halo-color': '#ffffff', 'text-halo-width': 2 }
                });
            }



            // Borders - Using OpenMapTiles vector tiles for comprehensive coverage
            const bordersSourceId = 'borders-source';
            const bordersCountryLayerId = 'borders-country-layer';
            const bordersStateLayerId = 'borders-state-layer';

            // Clean up existing border layers
            if (map.current.getLayer(bordersCountryLayerId)) map.current.removeLayer(bordersCountryLayerId);
            if (map.current.getLayer(bordersStateLayerId)) map.current.removeLayer(bordersStateLayerId);
            if (map.current.getSource(bordersSourceId)) map.current.removeSource(bordersSourceId);

            if (showBorders) {
                // OpenMapTiles vector source - same as labels, contains admin boundaries
                if (!map.current.getSource(bordersSourceId)) {
                    map.current.addSource(bordersSourceId, {
                        type: 'vector',
                        url: 'https://tiles.openfreemap.org/planet'
                    });
                }

                // Country borders (admin_level 2) - more pronounced
                map.current.addLayer({
                    id: bordersCountryLayerId,
                    type: 'line',
                    source: bordersSourceId,
                    'source-layer': 'boundary',
                    filter: ['all',
                        ['==', 'admin_level', 2],
                        ['==', 'maritime', 0]
                    ],
                    paint: {
                        'line-color': '#1e293b',
                        'line-width': ['interpolate', ['linear'], ['zoom'],
                            2, 1.5,
                            6, 2.5,
                            10, 3
                        ],
                        'line-opacity': 0.9
                    }
                }, 'slot-overlays');

                // State/Province borders (admin_level 4) - slimmer with subtle dash
                map.current.addLayer({
                    id: bordersStateLayerId,
                    type: 'line',
                    source: bordersSourceId,
                    'source-layer': 'boundary',
                    filter: ['all',
                        ['==', 'admin_level', 4],
                        ['==', 'maritime', 0]
                    ],
                    minzoom: 4,
                    paint: {
                        'line-color': '#475569',
                        'line-width': ['interpolate', ['linear'], ['zoom'],
                            4, 0.8,
                            8, 1.5,
                            12, 2
                        ],
                        'line-opacity': 0.7,
                        'line-dasharray': [4, 2]
                    }
                }, 'slot-overlays');
            }

            // Global Admin Regions (Dynamic)
            const globalAdminSourceId = 'global-admin-source';
            const globalAdminLayerId = 'global-admin-layer';

            if (map.current.getSource(globalAdminSourceId)) {
                if (map.current.getLayer(globalAdminLayerId)) map.current.removeLayer(globalAdminLayerId);
                map.current.removeSource(globalAdminSourceId);
            }

            if (selectedAdminCountry) {
                // GeoBoundaries URL Structure (using media proxy for LFS support):
                // https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen/{ISO}/ADM1/geoBoundaries-{ISO}-ADM1.geojson
                const url = `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen/${selectedAdminCountry}/ADM1/geoBoundaries-${selectedAdminCountry}-ADM1.geojson`;

                map.current.addSource(globalAdminSourceId, {
                    type: 'geojson',
                    data: url
                });

                map.current.addLayer({
                    id: globalAdminLayerId,
                    type: 'line',
                    source: globalAdminSourceId,
                    paint: {
                        'line-color': '#e11d48',
                        'line-width': 2,
                        'line-dasharray': [2, 2]
                    }
                }, 'slot-overlays');
            }
        };

        const updateMapState = () => {
            if (!map.current) return;

            const layerConfig = MAP_STYLES[activeLayer];
            if (!layerConfig) return;

            if (activeLayer !== lastActiveLayer.current) {
                lastActiveLayer.current = activeLayer;

                if (layerConfig.type === 'style') {
                    // Vector Style
                    map.current.setStyle(layerConfig.url);
                    map.current.once('styledata', () => {
                        initSlots();
                        updateLanguage();
                        updateOverlays();

                        // Restore Ruler
                        if (!map.current?.getSource('ruler-source')) {
                            map.current?.addSource('ruler-source', {
                                type: 'geojson',
                                data: { type: 'FeatureCollection', features: [] }
                            });
                            map.current?.addLayer({
                                id: 'ruler-line',
                                type: 'line',
                                source: 'ruler-source',
                                paint: { 'line-color': '#3b82f6', 'line-width': 3, 'line-dasharray': [2, 1] },
                                filter: ['==', '$type', 'LineString']
                            });
                            map.current?.addLayer({
                                id: 'ruler-points',
                                type: 'circle',
                                source: 'ruler-source',
                                paint: { 'circle-radius': 5, 'circle-color': '#3b82f6', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
                                filter: ['==', '$type', 'Point']
                            });
                        }
                    });
                } else {
                    // Raster Style with Raster Labels
                    const baseSourceId = 'base-tiles-source';
                    const baseLayerId = 'base-tiles-layer';
                    const labelsSourceId = 'labels-source';
                    const labelsLayerId = 'labels-layer';

                    // Clean up existing layers
                    if (map.current.getLayer(baseLayerId)) map.current.removeLayer(baseLayerId);
                    if (map.current.getLayer(labelsLayerId)) map.current.removeLayer(labelsLayerId);
                    if (map.current.getSource(baseSourceId)) map.current.removeSource(baseSourceId);
                    if (map.current.getSource(labelsSourceId)) map.current.removeSource(labelsSourceId);

                    // Add base raster tiles
                    map.current.addSource(baseSourceId, {
                        type: 'raster',
                        tiles: [layerConfig.url],
                        tileSize: 256,
                        attribution: layerConfig.attribution
                    });

                    initSlots();

                    map.current.addLayer({
                        id: baseLayerId,
                        type: 'raster',
                        source: baseSourceId,
                        paint: { 'raster-opacity': 1 }
                    }, 'slot-base');

                    // Add VECTOR labels for multilingual support
                    if (showLabels) {
                        const vectorSourceId = 'vector-labels-source';

                        // Clean up old vector label layers first
                        VECTOR_LABEL_LAYER_IDS.forEach(id => {
                            if (map.current?.getLayer(id)) map.current.removeLayer(id);
                        });

                        if (!map.current.getSource(vectorSourceId)) {
                            // OpenMapTiles vector tiles - contains name, name:en, name:bg, etc.
                            map.current.addSource(vectorSourceId, {
                                type: 'vector',
                                url: 'https://tiles.openfreemap.org/planet'
                            });
                        }

                        // Get language field based on current language
                        const langField = currentLang === 'en' ? 'name:en' :
                            currentLang === 'bg' ? 'name:bg' :
                                currentLang === 'it' ? 'name:it' : 'name';

                        const isDarkMap = layerConfig.isDark;
                        const textColor = isDarkMap ? '#ffffff' : '#1a1a2e';
                        const haloColor = isDarkMap ? '#000000' : '#ffffff';

                        // Add all vector label layers using helper
                        addVectorLabelLayers(map.current, vectorSourceId, langField, textColor, haloColor);
                    }

                    updateOverlays();
                }
            } else {
                updateOverlays();

                // Handle Vector Labels Toggle (when layer didn't change)
                if (layerConfig.type === 'raster') {
                    const vectorSourceId = 'vector-labels-source';

                    if (showLabels) {
                        // Check if we need to add the source
                        if (!map.current.getSource(vectorSourceId)) {
                            map.current.addSource(vectorSourceId, {
                                type: 'vector',
                                url: 'https://tiles.openfreemap.org/planet'
                            });
                        }

                        // Add layers if they don't exist - use helper for all 6 layers
                        if (!map.current.getLayer('vector-labels-country')) {
                            const langField = currentLang === 'en' ? 'name:en' :
                                currentLang === 'bg' ? 'name:bg' :
                                    currentLang === 'it' ? 'name:it' : 'name';

                            const isDarkMap = layerConfig.isDark;
                            const textColor = isDarkMap ? '#ffffff' : '#1a1a2e';
                            const haloColor = isDarkMap ? '#000000' : '#ffffff';

                            addVectorLabelLayers(map.current, vectorSourceId, langField, textColor, haloColor);
                        }
                    } else {
                        // Remove vector label layers
                        VECTOR_LABEL_LAYER_IDS.forEach(id => {
                            if (map.current?.getLayer(id)) map.current.removeLayer(id);
                        });
                    }
                }
            }
        };

        updateMapState();

    }, [activeLayer, showLabels, showBorders, selectedAdminCountry, showGraticules, isMapLoaded, currentLang, updateLanguage]);

    // Language Update Effect
    useEffect(() => {
        if (isMapLoaded) {
            updateLanguage();
        }
    }, [currentLang, isMapLoaded, activeLayer, updateLanguage]);

    return (
        <div className="map-wrapper">
            <div
                ref={mapContainer}
                className="map-container"
                style={{
                    opacity: isMapLoaded ? 1 : 0,
                    transition: 'opacity 1.5s ease-in-out'
                }}
            />
        </div>
    );
});

export default MapContainer;
