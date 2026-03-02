import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import './LayerMenu.css';
import { springs, variants } from '../../utils/animations';
import type { MapStyleId } from '../Map/mapStyles';
import { MAP_STYLES } from '../Map/mapStyles';
import { COUNTRIES } from '../../utils/countries';
import type { Translation } from '../../utils/translations';

interface LayerMenuProps {
    activeLayer: MapStyleId;
    onLayerChange: (layer: MapStyleId) => void;
    showGraticules: boolean;
    onToggleGraticules: () => void;
    showLabels: boolean;
    onToggleLabels: () => void;
    showBorders: boolean;
    onToggleBorders: () => void;

    translations: Translation;
    isDark: boolean;
    selectedAdminCountry: string | null;
    onSelectAdminCountry: (country: string | null) => void;
}

const LayerMenu: React.FC<LayerMenuProps> = ({
    activeLayer,
    onLayerChange,
    showGraticules,
    onToggleGraticules,
    showLabels,
    onToggleLabels,
    showBorders,
    onToggleBorders,

    translations,
    selectedAdminCountry,
    onSelectAdminCountry,
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const toggleDropdown = () => {
        if (document.startViewTransition) {
            document.startViewTransition(() => {
                setIsDropdownOpen(prev => !prev);
            });
        } else {
            setIsDropdownOpen(prev => !prev);
        }
    };

    return (
        <div className="layer-menu-container">
            {/* Zone A: Map Mode Selector (Segmented Control) */}
            <div className="zone-a-selector">
                <div className="segmented-control">
                    {Object.entries(MAP_STYLES).map(([id]) => (
                        <motion.div
                            key={id}
                            className={`segment-item ${activeLayer === id ? 'active' : ''}`}
                            onClick={() => onLayerChange(id as MapStyleId)}
                            whileHover={variants.subtle.hover}
                            whileTap={variants.subtle.tap}
                        >
                            {activeLayer === id && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="active-pill-bg"
                                    transition={springs.snappy}
                                />
                            )}
                            <span className="segment-label">{translations.layers[id as MapStyleId]}</span>
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="glass-divider"></div>

            {/* Zone B: Data Layers (Toggles) */}
            <div className="zone-b-layers">
                <ToggleItem
                    label={translations.overlays.graticules}
                    isOn={showGraticules}
                    onToggle={onToggleGraticules}
                />
                <ToggleItem
                    label={translations.overlays.labels}
                    isOn={!showLabels}
                    onToggle={onToggleLabels}
                />
                <ToggleItem
                    label={translations.overlays.borders}
                    isOn={showBorders}
                    onToggle={onToggleBorders}
                />


                <div className="glass-divider"></div>

                {/* Country Selector Dropdown */}
                <div className="dropdown-section">
                    <span className="section-label">{translations.overlays.administrativeRegions}</span>
                    <div className="custom-dropdown">
                        <motion.button
                            className="dropdown-trigger"
                            onClick={toggleDropdown}
                            whileHover={variants.subtle.hover}
                            whileTap={variants.subtle.tap}
                        >
                            <span className="selected-text">
                                {selectedAdminCountry
                                    ? COUNTRIES.find(c => c.code === selectedAdminCountry)?.name
                                    : translations.overlays.none}
                            </span>
                            <motion.div
                                animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                                transition={springs.snappy}
                            >
                                <ChevronDown size={14} />
                            </motion.div>
                        </motion.button>

                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div
                                    className="dropdown-menu-list glass-panel"
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <motion.div
                                        className={`dropdown-item ${!selectedAdminCountry ? 'selected' : ''}`}
                                        onClick={() => {
                                            onSelectAdminCountry(null);
                                            setIsDropdownOpen(false);
                                        }}
                                        whileHover={variants.subtle.hover}
                                        whileTap={variants.subtle.tap}
                                    >
                                        <span>{translations.overlays.none}</span>
                                        {!selectedAdminCountry && <Check size={14} />}
                                    </motion.div>
                                    <div className="dropdown-separator"></div>
                                    {COUNTRIES.map((country) => (
                                        <motion.div
                                            key={country.code}
                                            className={`dropdown-item ${selectedAdminCountry === country.code ? 'selected' : ''}`}
                                            onClick={() => {
                                                onSelectAdminCountry(country.code);
                                                setIsDropdownOpen(false);
                                            }}
                                            whileHover={variants.subtle.hover}
                                            whileTap={variants.subtle.tap}
                                        >
                                            <span className="country-row">
                                                {/* Flag emoji removed as per request */}
                                                {country.name}
                                            </span>
                                            {selectedAdminCountry === country.code && <Check size={14} />}
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div >
                </div >
            </div >
        </div >
    );
};

// Reusable Spring-Loaded Toggle Component
const ToggleItem = ({ label, isOn, onToggle }: { label: string, isOn: boolean, onToggle: () => void }) => {
    return (
        <motion.div
            className="toggle-row"
            onClick={onToggle}
            whileHover={variants.subtle.hover}
            whileTap={variants.subtle.tap}
        >
            <span className="toggle-label">{label}</span>
            <div className={`toggle-switch-container ${isOn ? 'on' : 'off'}`}>
                <motion.div
                    className="toggle-handle"
                    layout
                    transition={springs.snappy}
                />
            </div>
        </motion.div>
    );
};

export default memo(LayerMenu);
