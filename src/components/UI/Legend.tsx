import React from 'react';
import './Legend.css';
import type { Translation } from '../../utils/translations';

interface LegendProps {
    showWeather: boolean;

    activeLayer: string;
    weatherTs?: string;
    translations: Translation;
}

const Legend: React.FC<LegendProps> = ({ showWeather, activeLayer, weatherTs, translations }) => {

    // Don't show if no relevant layers are active
    if (!showWeather && activeLayer !== 'relief' && activeLayer !== 'topo') {
        return null;
    }

    return (
        <div className="map-legend">
            {/* Rain Legend (RainViewer Universal Blue) */}
            {showWeather && (
                <div className="legend-section">
                    <div className="legend-title">
                        {translations.legend.precipitation}
                        {weatherTs && <span className="legend-ts"> ({weatherTs})</span>}
                    </div>
                    <div className="legend-gradient rain-gradient"></div>
                    <div className="legend-labels">
                        <span>{translations.legend.light}</span>
                        <span>{translations.legend.moderate}</span>
                        <span>{translations.legend.heavy}</span>
                    </div>
                </div>
            )}



            {/* Elevation Legend (For Relief/Topo) */}
            {(activeLayer === 'relief' || activeLayer === 'topo') && (
                <div className="legend-section">
                    <div className="legend-title">{translations.legend.elevation}</div>
                    <div className="legend-gradient elevation-gradient"></div>
                    <div className="legend-labels">
                        <span>0</span>
                        <span>500</span>
                        <span>2000</span>
                        <span>4000+</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Legend;
