export type MapStyleId = 'political' | 'satellite';

export interface MapStyle {
    id: MapStyleId;
    name: string;
    url: string;
    labelsUrl?: string;           // Raster labels (fallback)
    vectorLabelsStyle?: string;   // Vector labels style URL for multilingual support
    type: 'raster' | 'style';
    attribution: string;
    maxzoom: number;
    isDark: boolean;
}

// OpenFreeMap vector tiles for multilingual labels
// Contains name:en, name:bg, name:de, name:it, etc.
export const VECTOR_LABELS_STYLE = 'https://tiles.openfreemap.org/styles/bright';

export const MAP_STYLES: Record<MapStyleId, MapStyle> = {
    political: {
        id: 'political',
        name: 'Political',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        vectorLabelsStyle: VECTOR_LABELS_STYLE,
        type: 'raster',
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxzoom: 16,
        isDark: false
    },
    satellite: {
        id: 'satellite',
        name: 'Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        vectorLabelsStyle: VECTOR_LABELS_STYLE,
        type: 'raster',
        attribution: 'Tiles &copy; Esri',
        maxzoom: 17,
        isDark: true
    }
};

