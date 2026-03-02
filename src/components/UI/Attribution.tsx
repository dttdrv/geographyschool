import React, { useState } from 'react';
import { Info } from 'lucide-react';
import './Attribution.css';
import type { Translation } from '../../utils/translations';

interface AttributionProps {
    onToggle: (isOpen: boolean) => void;
    translations: Translation;
}

const Attribution: React.FC<AttributionProps> = ({ onToggle, translations }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        onToggle(newState);
    };

    return (
        <>
            {/* Top-left Info Button */}
            <div className="info-btn-container">
                <button className="info-btn" onClick={handleToggle} title={translations.ui.about}>
                    <Info size={24} />
                </button>

                {isOpen && (
                    <div className="info-panel">
                        <h3>{translations.ui.about}</h3>
                        <p>{translations.ui.developedBy} <strong>Eptesicus Labs</strong></p>
                    </div>
                )}
            </div>

            {/* Bottom-right Attribution Text */}
            <div className="attribution-text">
                <span>© OpenStreetMap contributors, SRTM | © OpenTopoMap (CC-BY-SA) | Developed by Eptesicus Labs</span>
            </div>
        </>
    );
};

export default Attribution;
