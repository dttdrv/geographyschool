import React, { useState, useRef, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { Menu, MapPin, Ruler, X, Globe, Eye, EyeOff, Search, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Overlay.css';
import './ZoomControl.css';
const LayerMenu = lazy(() => import('./LayerMenu'));
import ZoomControl from './ZoomControl';
const SearchDropdown = lazy(() => import('./SearchDropdown'));
import { useWindowSize } from '../../hooks/useWindowSize';
import type { MapStyleId } from '../Map/mapStyles';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import { springs, transitions, variants } from '../../utils/animations';
import { initializeSearchEngine, fuzzySearch, type SearchResult } from '../../utils/searchEngine';
import type { SupportedLanguage, Translation } from '../../utils/translations';
export type Language = SupportedLanguage;

interface OverlayProps {
    onToolChange: (tool: string | null) => void;
    onLayerChange: (layer: MapStyleId) => void;
    measurement: string;
    onClearMeasurement: () => void;
    currentLang: Language;
    onLangChange: (lang: Language) => void;
    translations: Translation;
    currentLayer: MapStyleId;
    showGraticules: boolean;
    onToggleGraticules: () => void;
    showLabels: boolean;
    onToggleLabels: () => void;
    showBorders: boolean;
    onToggleBorders: () => void;

    selectedAdminCountry?: string | null;
    onSelectAdminCountry?: (country: string | null) => void;
    activeTool: string | null;
    coordinates: { lat: number; lng: number; zoom: number } | null;
    onLocationSelect: (location: any) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onLocateMe: () => void;
    isMapDark?: boolean;
}

const Overlay: React.FC<OverlayProps> = ({
    onToolChange,
    onLayerChange,
    measurement,
    onClearMeasurement,
    currentLang,
    onLangChange,
    translations,
    currentLayer,
    showGraticules,
    onToggleGraticules,
    showLabels,
    onToggleLabels,
    showBorders,
    onToggleBorders,

    selectedAdminCountry,
    onSelectAdminCountry,
    activeTool,
    coordinates,
    onLocationSelect,
    onZoomIn,
    onZoomOut,
    onLocateMe
}) => {
    const [showLayers, setShowLayers] = useState(false);
    const [showLang, setShowLang] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [uiVisible, setUiVisible] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [tracingFullscreen, setTracingFullscreen] = useState(false);
    const [tracingHideUI, setTracingHideUI] = useState(false);
    const [searchIconHover, setSearchIconHover] = useState(false);
    const [langIconHover, setLangIconHover] = useState(false);

    // Search engine state
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
    const [isSearchLoading, setIsSearchLoading] = useState(true);
    const searchDropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const isClosingSearchRef = useRef(false);

    const { width: windowWidth } = useWindowSize();
    const isMobile = windowWidth < 768;

    // Initialize search engine on mount
    useEffect(() => {
        initializeSearchEngine()
            .then(() => setIsSearchLoading(false))
            .catch(err => console.error('[Overlay] Search init failed:', err));
    }, []);

    // Debounced search effect
    useEffect(() => {
        if (!searchFocused || !searchQuery.trim()) {
            setSearchResults([]);
            setSelectedResultIndex(-1);
            return;
        }

        const debounceTimer = setTimeout(() => {
            const results = fuzzySearch(searchQuery, 8);
            setSearchResults(results);
            setSelectedResultIndex(results.length > 0 ? 0 : -1);
        }, 150);

        return () => clearTimeout(debounceTimer);
    }, [searchQuery, searchFocused]);

    // Handle search result selection
    const handleSelectResult = useCallback((result: SearchResult) => {
        onLocationSelect({
            center: [result.lng, result.lat],
            zoom: result.zoom,
            name: result.name
        });
        setSearchQuery('');
        setSearchFocused(false);
        setSearchResults([]);
        setSelectedResultIndex(-1);
    }, [onLocationSelect]);

    // Keyboard navigation handler
    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!searchResults.length) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedResultIndex(prev =>
                    prev < searchResults.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedResultIndex(prev =>
                    prev > 0 ? prev - 1 : searchResults.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedResultIndex >= 0 && searchResults[selectedResultIndex]) {
                    handleSelectResult(searchResults[selectedResultIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setSearchFocused(false);
                setSearchResults([]);
                break;
        }
    }, [searchResults, selectedResultIndex, handleSelectResult]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const toggleUI = () => {
        setUiVisible(!uiVisible);
    };

    const langMenuRef = useRef<HTMLDivElement>(null);
    const layerMenuRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(langMenuRef as React.RefObject<HTMLElement>, () => setShowLang(false));
    useOnClickOutside(layerMenuRef as React.RefObject<HTMLElement>, () => setShowLayers(false));

    const toggleLayers = () => {
        setShowLayers(!showLayers);
        if (!showLayers) onToolChange(null);
    };

    const scaleInfo = useMemo(() => {
        if (!coordinates) return null;
        const { lat, zoom } = coordinates;
        const metersPerPixel = 78271.517 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
        const targetWidthPx = 100;
        const targetMeters = targetWidthPx * metersPerPixel;

        let roundedMeters = 0;
        if (targetMeters > 1000000) roundedMeters = Math.round(targetMeters / 1000000) * 1000000;
        else if (targetMeters > 100000) roundedMeters = Math.round(targetMeters / 100000) * 100000;
        else if (targetMeters > 10000) roundedMeters = Math.round(targetMeters / 10000) * 10000;
        else if (targetMeters > 1000) roundedMeters = Math.round(targetMeters / 1000) * 1000;
        else if (targetMeters > 100) roundedMeters = Math.round(targetMeters / 100) * 100;
        else roundedMeters = Math.round(targetMeters / 10) * 10;

        const finalWidthPx = roundedMeters / metersPerPixel;
        const label = roundedMeters >= 1000 ? `${roundedMeters / 1000} km` : `${roundedMeters} m`;

        return { width: finalWidthPx, label };
    }, [coordinates]);

    // Responsive widths
    const getSearchWidth = () => {
        if (isMobile) {
            // On mobile: account for padding (20px left + 20px right = 40px total)
            // windowWidth - 48px for margins (24px each side) - 40px for padding
            return searchFocused ? (windowWidth - 88) : 160;
        }
        return searchFocused ? 360 : 260;
    };

    const getLangWidth = () => {
        // Language button is hidden on mobile
        if (isMobile) return 0;
        return showLang ? 360 : 48;
    };

    // Search bar now expands only to the right, no margin shift needed
    const getSearchMarginRight = () => {
        return 0;
    };

    const getLangMarginLeft = () => {
        if (isMobile) return 0;
        return showLang ? -324 : 0;
    };

    return (
        <div className="overlay-container">
            {/* ========================================
                TOP CENTER: Separate Search + Language Pills
                - TWO SEPARATE elements with gap
                - When search focused: expands and covers language button
                ======================================== */}
            <AnimatePresence>
                {uiVisible && (
                    <motion.div
                        className="top-center-group"
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        transition={springs.snappy}
                        style={{
                            position: 'absolute',
                            top: 24,
                            left: 0,
                            right: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            zIndex: 1010,
                            pointerEvents: 'none'
                        }}
                    >
                        {/* SEARCH BAR - Separate Pill with Liquid Glass morph */}
                        <motion.div
                            whileHover={variants.popOut.hover}
                            animate={{
                                width: getSearchWidth(),
                                boxShadow: searchFocused
                                    ? '0 16px 48px rgba(0,0,0,0.18)'
                                    : '0 8px 24px rgba(0,0,0,0.12)',
                                marginRight: getSearchMarginRight(),
                                opacity: !isMobile && showLang ? 0 : 1,
                                scale: !isMobile && showLang ? 0.6 : 1,
                                x: searchFocused && !isMobile ? 50 : (!isMobile && showLang ? 80 : 0),
                                filter: !isMobile && showLang ? 'blur(8px)' : 'blur(0px)',
                            }}
                            transition={transitions.morph(searchFocused || showLang)}
                            style={{
                                height: 48,
                                background: 'var(--surface-translucent)',
                                backdropFilter: 'var(--blur-slight)',
                                WebkitBackdropFilter: 'var(--blur-slight)',
                                borderRadius: 24,
                                display: 'flex',
                                alignItems: 'center',
                                overflow: 'visible',
                                paddingLeft: 20,
                                paddingRight: 20,
                                boxSizing: 'content-box',
                                justifyContent: 'flex-start',
                                position: 'relative',
                                zIndex: !isMobile && showLang ? 10 : 100,
                                pointerEvents: !isMobile && showLang ? 'none' : 'auto'
                            }}
                        >
                            <div
                                className="search-icon-wrapper"
                                style={{
                                    width: 20,
                                    height: 20,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    cursor: 'pointer',
                                    transition: 'color 0.2s ease',
                                    marginLeft: isMobile && !searchFocused ? 0 : 0
                                }}
                                onMouseEnter={() => setSearchIconHover(true)}
                                onMouseLeave={() => setSearchIconHover(false)}
                                onMouseDown={(e) => {
                                    // Use mousedown instead of click to intercept BEFORE focus events
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (searchFocused) {
                                        isClosingSearchRef.current = true;
                                        searchInputRef.current?.blur();
                                        setSearchFocused(false);
                                        setSearchQuery('');
                                        setTimeout(() => { isClosingSearchRef.current = false; }, 300);
                                    } else if (!isClosingSearchRef.current) {
                                        setSearchFocused(true);
                                        setTimeout(() => searchInputRef.current?.focus(), 50);
                                    }
                                }}
                            >
                                <AnimatePresence mode="wait">
                                    {searchFocused ? (
                                        <motion.div
                                            key="close"
                                            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}
                                        >
                                            <X size={20} color={searchIconHover ? '#EF4444' : '#000000'} />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="search"
                                            initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
                                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                            exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}
                                        >
                                            <Search size={20} color={searchIconHover ? '#3B82F6' : '#000000'} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => {
                                    // Only open if we're not in the middle of closing
                                    if (!isClosingSearchRef.current) {
                                        setSearchFocused(true);
                                    }
                                }}
                                onBlur={() => {
                                    // Delay to allow dropdown click
                                    setTimeout(() => {
                                        if (!searchQuery) setSearchFocused(false);
                                    }, 200);
                                }}
                                placeholder={translations.ui.searchPlaceholder}
                                style={{
                                    border: 'none',
                                    outline: 'none',
                                    background: 'transparent',
                                    marginLeft: 12,
                                    fontSize: 15,
                                    fontWeight: 500,
                                    color: '#111827',
                                    flex: 1,
                                    minWidth: 0,
                                    height: 'auto'
                                }}
                                onKeyDown={handleSearchKeyDown}
                            />

                            {/* Search Results Dropdown */}
                            <div ref={searchDropdownRef}>
                                <Suspense fallback={null}>
                                    <SearchDropdown
                                        results={searchResults}
                                        isLoading={isSearchLoading && searchFocused}
                                        isVisible={searchFocused && (searchResults.length > 0 || (searchQuery.length > 0 && !isSearchLoading))}
                                        selectedIndex={selectedResultIndex}
                                        onSelect={handleSelectResult}
                                        onHover={setSelectedResultIndex}
                                        highlightText={searchQuery}
                                        translations={translations}
                                    />
                                </Suspense>
                            </div>
                        </motion.div>

                        {/* LANGUAGE BUTTON - Hidden on mobile */}
                        {!isMobile && (
                            <motion.div
                                ref={langMenuRef}
                                className="lang-pill"
                                whileHover={!showLang && !searchFocused ? variants.popOut.hover : undefined}
                                animate={{
                                    width: getLangWidth(),
                                    marginLeft: getLangMarginLeft(),
                                    opacity: searchFocused ? 0 : 1,
                                    scale: searchFocused ? 0.6 : 1,
                                    x: searchFocused ? -80 : 0,
                                    filter: searchFocused ? 'blur(8px)' : 'blur(0px)',
                                    zIndex: showLang ? 150 : 10,
                                }}
                                transition={transitions.morph(searchFocused || showLang)}
                                style={{
                                    height: 48,
                                    background: 'var(--surface-translucent)',
                                    backdropFilter: 'var(--blur-slight)',
                                    WebkitBackdropFilter: 'var(--blur-slight)',
                                    borderRadius: 24,
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    pointerEvents: searchFocused ? 'none' : 'auto'
                                }}
                            >
                                {/* Language Options - Swapped order for Right-Icon Layout */}
                                <motion.div
                                    animate={{
                                        opacity: showLang ? 1 : 0,
                                        x: showLang ? 0 : 10
                                    }}
                                    transition={{
                                        duration: 0.15,
                                        delay: showLang ? 0.2 : 0
                                    }}
                                    style={{
                                        display: showLang ? 'flex' : 'none',
                                        alignItems: 'center',
                                        gap: 8,
                                        paddingLeft: 24,
                                        paddingRight: 4,
                                        pointerEvents: showLang ? 'auto' : 'none',
                                        flex: 1,
                                        justifyContent: 'space-evenly'
                                    }}
                                >
                                    {(['en', 'bg', 'it'] as Language[]).map((lang) => (
                                        <motion.button
                                            key={lang}
                                            className="lang-option-btn"
                                            whileHover={variants.subtle.hover}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => { onLangChange(lang); setShowLang(false); }}
                                            style={{
                                                height: 36,
                                                padding: '0 16px',
                                                border: 'none',
                                                background: currentLang === lang ? '#3B82F6' : '#F3F4F6',
                                                backdropFilter: 'none',
                                                WebkitBackdropFilter: 'none',
                                                borderRadius: 18,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color: currentLang === lang ? '#FFFFFF' : '#374151',
                                                cursor: 'pointer',
                                                flex: 1,
                                                maxWidth: 80,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {lang.toUpperCase()}
                                        </motion.button>
                                    ))}
                                </motion.div>

                                {/* Globe button - fixed on RIGHT */}
                                <div
                                    onClick={() => setShowLang(!showLang)}
                                    onMouseEnter={() => setLangIconHover(true)}
                                    onMouseLeave={() => setLangIconHover(false)}
                                    style={{
                                        width: 48,
                                        height: 48,
                                        minWidth: 48,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: langIconHover ? (showLang ? '#EF4444' : '#3B82F6') : '#000000',
                                        flexShrink: 0,
                                        transition: 'color 0.2s ease'
                                    }}
                                    title={translations.ui?.language || 'Language'}
                                >
                                    <AnimatePresence mode="wait">
                                        {showLang ? (
                                            <motion.div
                                                key="close"
                                                initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                                                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                                exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                                                transition={{ duration: 0.2 }}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <X size={22} />
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="globe"
                                                initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
                                                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                                exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
                                                transition={{ duration: 0.2 }}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Globe size={22} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ========================================
                BOTTOM LEFT: Coordinates & Scale
                ======================================== */}
            <AnimatePresence>
                {uiVisible && !isMobile && (
                    <motion.div
                        className="bottom-left-stack"
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -100, opacity: 0 }}
                        transition={springs.snappy}
                    >
                        {coordinates && (
                            <div className="coordinates-pill">
                                <span className="coords-text">
                                    {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                                </span>
                                {scaleInfo && (
                                    <div className="scale-container">
                                        <div className="scale-bar" style={{ width: scaleInfo.width }}></div>
                                        <div className="scale-label">{scaleInfo.label}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ========================================
                BOTTOM RIGHT: Zoom, Hide UI
                ======================================== */}
            {/* Stack container always rendered to hold the Hide UI button */}
            <div className="bottom-right-stack">
                <AnimatePresence>
                    {uiVisible && (
                        <motion.div
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 100, opacity: 0 }}
                            transition={springs.snappy}
                            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                        >
                            <ZoomControl onZoomIn={onZoomIn} onZoomOut={onZoomOut} onLocateMe={onLocateMe} translations={translations} />

                            {/* Fullscreen button - Desktop only */}
                            {!isMobile && (
                                <motion.button
                                    className={`zoom-btn ${tracingFullscreen ? 'tracing' : ''}`}
                                    onClick={() => {
                                        setTracingFullscreen(true);
                                        setTimeout(() => toggleFullscreen(), 100);
                                        setTimeout(() => setTracingFullscreen(false), 1500);
                                    }}
                                    whileTap={variants.popOut.tap}
                                    whileHover={variants.popOut.hover}
                                    transition={springs.soft}
                                    title={isFullscreen ? translations.view?.exitFullscreen || 'Exit Fullscreen' : translations.view?.fullscreen || 'Fullscreen'}
                                >
                                    {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                                </motion.button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.button
                    className={`zoom-btn ${tracingHideUI ? 'tracing' : ''}`}
                    onClick={() => {
                        setTracingHideUI(true);
                        setTimeout(() => toggleUI(), 100);
                        setTimeout(() => setTracingHideUI(false), 1500);
                    }}
                    whileTap={variants.popOut.tap}
                    whileHover={variants.popOut.hover}
                    transition={springs.soft}
                    title={uiVisible ? translations.view?.hideUI || 'Hide UI' : translations.view?.showUI || 'Show UI'}
                >
                    {uiVisible ? <EyeOff size={22} /> : <Eye size={22} />}
                </motion.button>
            </div>

            {/* ========================================
                MEASUREMENT DISPLAY
                ======================================== */}
            <AnimatePresence>
                {measurement && uiVisible && (
                    <motion.div
                        className="measurement-pill"
                        initial={{ scale: 0.95, opacity: 0, x: "-50%" }}
                        animate={{ scale: 1, opacity: 1, x: "-50%" }}
                        exit={{ scale: 0.95, opacity: 0, x: "-50%" }}
                        transition={springs.snappy}
                    >
                        <span className="measure-text">{measurement}</span>
                        <button
                            className="measurement-close-btn"
                            onClick={onClearMeasurement}
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ========================================
                BOTTOM CENTER: Morphing Dock
                ======================================== */}
            <AnimatePresence>
                {uiVisible && (
                    <div className="dock-wrapper" ref={layerMenuRef}>
                        <motion.div
                            className="morphing-dock"
                            initial={{ y: 100, opacity: 0 }}
                            animate={{
                                y: 0,
                                opacity: 1,
                                width: showLayers ? 360 : 'auto',
                                height: showLayers ? 540 : 54,
                                borderRadius: showLayers ? 32 : 999,
                            }}
                            exit={{ y: 100, opacity: 0 }}
                            transition={transitions.morph(showLayers)}
                            style={{
                                background: 'var(--surface-translucent)',
                                backdropFilter: 'var(--blur-slight)',
                                WebkitBackdropFilter: 'var(--blur-slight)',
                                boxShadow: '0 16px 48px -12px rgba(0,0,0,0.18)',
                                overflow: 'hidden',
                            }}
                        >
                            <AnimatePresence mode="wait">
                                {showLayers ? (
                                    <motion.div
                                        key="panel"
                                        className="morphed-panel-content"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2, delay: 0.15 }}
                                    >
                                        <div className="panel-header">
                                            <span>{translations.ui.mapLayers}</span>
                                        </div>
                                        <Suspense fallback={<div style={{ minHeight: '200px' }} />}>
                                            <LayerMenu
                                                activeLayer={currentLayer}
                                                onLayerChange={onLayerChange}
                                                showGraticules={showGraticules}
                                                onToggleGraticules={onToggleGraticules}
                                                showLabels={showLabels}
                                                onToggleLabels={onToggleLabels}
                                                showBorders={showBorders}
                                                onToggleBorders={onToggleBorders}

                                                translations={translations}
                                                isDark={false}
                                                selectedAdminCountry={selectedAdminCountry || null}
                                                onSelectAdminCountry={onSelectAdminCountry || (() => { })}
                                            />
                                        </Suspense>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="dock"
                                        className="dock-buttons"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2, delay: 0.15 }}
                                    >
                                        <button
                                            className={`dock-btn ${activeTool === 'marker' ? 'active' : ''}`}
                                            onClick={() => onToolChange(activeTool === 'marker' ? null : 'marker')}
                                            title={translations.tools.marker}
                                        >
                                            <MapPin size={22} />
                                        </button>

                                        <div className="dock-divider"></div>

                                        {/* Placeholder for center button */}
                                        <div className="dock-btn-placeholder"></div>

                                        <div className="dock-divider"></div>

                                        <button
                                            className={`dock-btn ${activeTool === 'measure-distance' ? 'active' : ''}`}
                                            onClick={() => onToolChange(activeTool === 'measure-distance' ? null : 'measure-distance')}
                                            title={translations.tools.measure}
                                        >
                                            <Ruler size={22} />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Center button - absolutely positioned at bottom center, persists across panel/dock */}
                            <motion.button
                                className={`dock-center-btn ${showLayers ? 'is-close' : ''}`}
                                onClick={toggleLayers}
                                style={{
                                    position: 'absolute',
                                    bottom: showLayers ? 16 : 5,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 10,
                                }}
                                animate={{
                                    bottom: showLayers ? 16 : 5,
                                }}
                                transition={{ duration: 0.2 }}
                            >
                                <AnimatePresence mode="wait">
                                    {showLayers ? (
                                        <motion.div
                                            key="close"
                                            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <X size={22} />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="menu"
                                            initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
                                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                            exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Menu size={22} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Overlay;
