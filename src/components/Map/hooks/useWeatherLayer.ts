import React, { useEffect } from 'react';
import maplibregl from 'maplibre-gl';

interface WeatherDebugInfo {
    weatherTs?: string;
    [key: string]: unknown;
}

interface UseWeatherLayerProps {
    map: React.MutableRefObject<maplibregl.Map | null>;
    isMapLoaded: boolean;
    showWeather: boolean;
    setDebugInfo: React.Dispatch<React.SetStateAction<WeatherDebugInfo>>;
}

export const useWeatherLayer = ({
    map,
    isMapLoaded,
    showWeather,
    setDebugInfo
}: UseWeatherLayerProps) => {

    useEffect(() => {
        if (!map.current || !isMapLoaded) return;

        const rainSourceId = 'weather-rain-source';
        const rainLayerId = 'weather-rain-layer';

        // Cleanup function
        const cleanupLayers = () => {
            if (map.current?.getLayer(rainLayerId)) map.current.removeLayer(rainLayerId);
            if (map.current?.getSource(rainSourceId)) map.current.removeSource(rainSourceId);
        };

        const updateWeather = async () => {
            if (!map.current) return;

            if (!showWeather) {
                cleanupLayers();
                setDebugInfo((prev) => ({ ...prev, weatherTs: 'OFF' }));
                return;
            }

            try {
                // --- 1. Rain (RainViewer) ---
                // We fetch the latest available timestamp from RainViewer API
                let rainTileUrl = '';
                if (showWeather) {
                    try {
                        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
                        const data = await response.json();

                        // Get the last "past" frame (most recent observed data)
                        if (data.radar && data.radar.past && data.radar.past.length > 0) {
                            const lastPastFrame = data.radar.past[data.radar.past.length - 1];
                            const host = data.host;
                            const path = lastPastFrame.path;
                            // Construct URL: {host}{path}/256/{z}/{x}/{y}/2/1_1.png
                            // Color 2 = Universal Blue
                            // Options 1_1 = Smooth + Snow
                            rainTileUrl = `${host}${path}/256/{z}/{x}/{y}/2/1_1.png`;
                            setDebugInfo((prev) => ({ ...prev, weatherTs: `Rain: ${new Date(lastPastFrame.time * 1000).toLocaleTimeString()}` }));
                        }
                    } catch (err) {
                        console.error('Failed to fetch RainViewer data', err);
                        setDebugInfo((prev) => ({ ...prev, weatherTs: 'Rain Fetch Error' }));
                    }
                }



                const insertBefore = 'slot-roads'; // Weather goes under roads



                // --- Rain (RainViewer) ---
                if (showWeather && rainTileUrl) {
                    if (map.current.getLayer(rainLayerId)) map.current.removeLayer(rainLayerId);
                    if (map.current.getSource(rainSourceId)) map.current.removeSource(rainSourceId);

                    map.current.addSource(rainSourceId, {
                        type: 'raster',
                        tiles: [rainTileUrl],
                        tileSize: 256,
                        attribution: 'Data &copy; RainViewer',
                        maxzoom: 12
                    });

                    map.current.addLayer({
                        id: rainLayerId,
                        type: 'raster',
                        source: rainSourceId,
                        paint: { 'raster-opacity': 0.7 }
                    }, insertBefore);
                } else {
                    if (map.current.getLayer(rainLayerId)) map.current.removeLayer(rainLayerId);
                    if (map.current.getSource(rainSourceId)) map.current.removeSource(rainSourceId);
                }

            } catch (e) {
                console.error("Critical Weather Error", e);
                setDebugInfo((prev) => ({ ...prev, weatherTs: 'CRITICAL ERR' }));
            }
        };

        updateWeather();

        // Check for updates every 10 minutes
        const intervalId = setInterval(updateWeather, 600000);

        return () => {
            clearInterval(intervalId);
            cleanupLayers();
        };

    }, [showWeather, isMapLoaded, map, setDebugInfo]);
};
