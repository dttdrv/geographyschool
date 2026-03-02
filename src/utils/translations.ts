import type { MapStyleId } from '../components/Map/mapStyles';

export type SupportedLanguage = 'en' | 'bg' | 'it';

export interface Translation {
    tools: {
        draw: string;
        marker: string;
        measure: string;
        layers: string;
        continents: string;
    };
    layers: Record<MapStyleId, string>;
    overlays: {
        graticules: string;
        labels: string;
        borders: string;
        administrativeRegions: string;
        selectCountry: string;
        none: string;
        rain: string;
    };
    ui: {
        measurement: string;
        mapLayers: string;
        overlays: string;
        continents: string;
        language: string;
        about: string;
        developedBy: string;
        searchPlaceholder: string;
    };
    search: {
        noResults: string;
        loading: string;
        country: string;
        capital: string;
        city: string;
        town: string;
        village: string;
        landmark: string;
    };
    legend: {
        precipitation: string;
        temp: string;
        elevation: string;
        light: string;
        moderate: string;
        heavy: string;
    };
    marker: {
        selectedLocation: string;
        openInGoogleMaps: string;
        removeMarker: string;
        lat: string;
        lng: string;
    };
    view: {
        hideUI: string;
        showUI: string;
        fullscreen: string;
        exitFullscreen: string;
    };
    controls: {
        zoomIn: string;
        zoomOut: string;
        locateMe: string;
    };
}

export const translations: Record<SupportedLanguage, Translation> = {

    en: {
        tools: {
            draw: 'Draw',
            marker: 'Marker',
            measure: 'Measure',
            layers: 'Layers',
            continents: 'Continents'
        },
        layers: {
            political: 'Political',
            satellite: 'Satellite'
        },
        overlays: {
            graticules: 'Grid',
            labels: 'Hide Labels',
            borders: 'Country Borders',
            administrativeRegions: 'Administrative Regions',
            selectCountry: 'Select Country',
            none: 'None',
            rain: 'Rain'
        },
        ui: {
            measurement: 'Measurement',
            mapLayers: 'MAP STYLE',
            overlays: 'OVERLAYS',
            continents: 'Continents',
            language: 'Language',
            about: 'About',
            developedBy: 'Developed by',
            searchPlaceholder: 'Search location...'
        },
        search: {
            noResults: 'No locations found for',
            loading: 'Loading search...',
            country: 'Country',
            capital: 'Capital',
            city: 'City',
            town: 'Town',
            village: 'Village',
            landmark: 'Landmark'
        },
        legend: {
            precipitation: 'Precipitation',
            temp: 'Land Surface Temp (°C)',
            elevation: 'Elevation (m)',
            light: 'Light',
            moderate: 'Moderate',
            heavy: 'Heavy'
        },
        marker: {
            selectedLocation: 'Selected Location',
            openInGoogleMaps: 'Open in Google Maps',
            removeMarker: 'Remove Marker',
            lat: 'Lat',
            lng: 'Lng'
        },
        view: {
            hideUI: 'Hide UI',
            showUI: 'Show UI',
            fullscreen: 'Full Screen',
            exitFullscreen: 'Exit Full Screen'
        },
        controls: {
            zoomIn: 'Zoom In',
            zoomOut: 'Zoom Out',
            locateMe: 'Locate Me'
        }
    },
    bg: {
        tools: {
            draw: 'Рисуване',
            marker: 'Маркер',
            measure: 'Измерване',
            layers: 'Слоеве',
            continents: 'Континенти'
        },
        layers: {
            political: 'Политическа',
            satellite: 'Сателитна'
        },
        overlays: {
            graticules: 'Мрежа',
            labels: 'Скрий етикетите',
            borders: 'Държавни граници',
            administrativeRegions: 'Административни Области',
            selectCountry: 'Избери Държава',
            none: 'Няма',
            rain: 'Дъжд'
        },
        ui: {
            measurement: 'Измерване',
            mapLayers: 'СТИЛ НА КАРТАТА',
            overlays: 'СЛОЕВЕ',
            continents: 'Континенти',
            language: 'Език',
            about: 'За приложението',
            developedBy: 'Разработено от',
            searchPlaceholder: 'Търсене на локация...'
        },
        search: {
            noResults: 'Не са намерени локации за',
            loading: 'Зареждане на търсене...',
            country: 'Държава',
            capital: 'Столица',
            city: 'Град',
            town: 'Градче',
            village: 'Село',
            landmark: 'Забележителност'
        },
        legend: {
            precipitation: 'Валежи',
            temp: 'Температура на повърхността (°C)',
            elevation: 'Надморска височина (м)',
            light: 'Леки',
            moderate: 'Умерени',
            heavy: 'Тежки'
        },
        marker: {
            selectedLocation: 'Избрана локация',
            openInGoogleMaps: 'Отвори в Google Maps',
            removeMarker: 'Премахни маркера',
            lat: 'Шир',
            lng: 'Дълж'
        },
        view: {
            hideUI: 'Скрий UI',
            showUI: 'Покажи UI',
            fullscreen: 'Пълен Екран',
            exitFullscreen: 'Изход от Пълен Екран'
        },
        controls: {
            zoomIn: 'Увеличи',
            zoomOut: 'Намали',
            locateMe: 'Моята Локация'
        }
    },
    it: {
        tools: {
            draw: 'Disegna',
            marker: 'Marcatore',
            measure: 'Misura',
            layers: 'Livelli',
            continents: 'Continenti'
        },
        layers: {
            political: 'Politica',
            satellite: 'Satellite'
        },
        overlays: {
            graticules: 'Reticolo',
            labels: 'Nascondi Etichette',
            borders: 'Confini Nazionali',
            administrativeRegions: 'Regioni Amministrative',
            selectCountry: 'Seleziona Paese',
            none: 'Nessuno',
            rain: 'Pioggia'
        },
        ui: {
            measurement: 'Misurazione',
            mapLayers: 'STILE MAPPA',
            overlays: 'SOVRAPPOSIZIONI',
            continents: 'Continenti',
            language: 'Lingua',
            about: 'Informazioni',
            developedBy: 'Sviluppato da',
            searchPlaceholder: 'Cerca posizione...'
        },
        search: {
            noResults: 'Nessuna posizione trovata per',
            loading: 'Caricamento ricerca...',
            country: 'Paese',
            capital: 'Capitale',
            city: 'Città',
            town: 'Cittadina',
            village: 'Villaggio',
            landmark: 'Punto di interesse'
        },
        legend: {
            precipitation: 'Precipitazioni',
            temp: 'Temp. Superficie (°C)',
            elevation: 'Altitudine (m)',
            light: 'Leggera',
            moderate: 'Moderata',
            heavy: 'Forte'
        },
        marker: {
            selectedLocation: 'Posizione Selezionata',
            openInGoogleMaps: 'Apri in Google Maps',
            removeMarker: 'Rimuovi Marcatore',
            lat: 'Lat',
            lng: 'Lng'
        },
        view: {
            hideUI: 'Nascondi UI',
            showUI: 'Mostra UI',
            fullscreen: 'Schermo Intero',
            exitFullscreen: 'Esci da Schermo Intero'
        },
        controls: {
            zoomIn: 'Ingrandisci',
            zoomOut: 'Riduci',
            locateMe: 'La Mia Posizione'
        }
    }
};
