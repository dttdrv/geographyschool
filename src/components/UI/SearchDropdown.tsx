import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Flag, Building2, Mountain, Loader2, Home, TreePine } from 'lucide-react';
import type { SearchResult } from '../../utils/searchEngine';
import type { Translation } from '../../utils/translations';

interface SearchDropdownProps {
    results: SearchResult[];
    isLoading: boolean;
    isVisible: boolean;
    selectedIndex: number;
    onSelect: (result: SearchResult) => void;
    onHover: (index: number) => void;
    highlightText: string;
    translations: Translation;
}

// Icon mapping for result types
const TypeIcon: React.FC<{ type: SearchResult['type']; size?: number }> = ({ type, size = 16 }) => {
    switch (type) {
        case 'country': return <Flag size={size} />;
        case 'capital': return <Building2 size={size} />;
        case 'city': return <MapPin size={size} />;
        case 'town': return <Home size={size} />;
        case 'village': return <TreePine size={size} />;
        case 'landmark': return <Mountain size={size} />;
        default: return <MapPin size={size} />;
    }
};

// Highlight matching text in result name
const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
    if (!highlight.trim()) return <>{text}</>;

    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <span key={i} style={{ color: '#3B82F6', fontWeight: 600 }}>{part}</span>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
};

// Type label colors
const typeColors: Record<SearchResult['type'], string> = {
    country: '#10B981',  // green
    capital: '#8B5CF6',  // purple
    city: '#3B82F6',     // blue
    town: '#06B6D4',     // cyan
    village: '#84CC16',  // lime
    landmark: '#F59E0B', // amber
};

const SearchDropdown: React.FC<SearchDropdownProps> = ({
    results,
    isLoading,
    isVisible,
    selectedIndex,
    onSelect,
    onHover,
    highlightText,
    translations
}) => {
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Translated type labels
    const typeLabels: Record<SearchResult['type'], string> = {
        country: translations.search.country,
        capital: translations.search.capital,
        city: translations.search.city,
        town: translations.search.town,
        village: translations.search.village,
        landmark: translations.search.landmark
    };

    // Auto-scroll to selected item
    useEffect(() => {
        if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
            itemRefs.current[selectedIndex]?.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }, [selectedIndex]);

    const itemCount = results.length;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    style={{
                        position: 'absolute',
                        top: 56,
                        left: 0,
                        right: 0,
                        background: 'var(--surface-glass-ultra)',
                        backdropFilter: 'var(--blur-ultra)',
                        WebkitBackdropFilter: 'var(--blur-ultra)',
                        borderRadius: 24,
                        boxShadow: '0 16px 48px -12px rgba(0,0,0,0.18)',
                        overflow: 'hidden',
                        zIndex: 200
                    }}
                >
                    {/* Loading state */}
                    {isLoading && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            padding: 16,
                            color: '#6B7280',
                            fontSize: 14
                        }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                                <Loader2 size={18} />
                            </motion.div>
                            {translations.search.loading}
                        </div>
                    )}

                    {/* Results list - scrollable but hidden scrollbar */}
                    {!isLoading && itemCount > 0 && (
                        <div
                            style={{
                                padding: '12px 0',
                                maxHeight: 280,
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                scrollbarWidth: 'none',  // Firefox
                                msOverflowStyle: 'none', // IE/Edge
                            }}
                            className="search-results-container"
                        >
                            {results.map((result, index) => {
                                const isSelected = index === selectedIndex;
                                return (
                                    <div
                                        key={result.id}
                                        ref={el => { itemRefs.current[index] = el; }}
                                        style={{
                                            padding: '0 8px',
                                            boxSizing: 'border-box'
                                        }}
                                        onMouseEnter={() => onHover(index)}
                                        onClick={() => onSelect(result)}
                                    >
                                        <div
                                            style={{
                                                height: 48,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: '0 12px',
                                                borderRadius: 12,
                                                cursor: 'pointer',
                                                background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                transition: 'background 0.15s ease'
                                            }}
                                        >
                                            {/* Icon - Circular */}
                                            <div style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                background: `${typeColors[result.type]}15`,
                                                color: typeColors[result.type],
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <TypeIcon type={result.type} />
                                            </div>

                                            {/* Content */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontSize: 14,
                                                    fontWeight: 500,
                                                    color: '#111827',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    <HighlightedText text={result.name} highlight={highlightText} />
                                                </div>
                                                <div style={{
                                                    fontSize: 12,
                                                    color: '#6B7280',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {result.type === 'country' ? typeLabels.country : result.country || typeLabels[result.type]}
                                                </div>
                                            </div>

                                            {/* Type badge - Pill shaped (fully rounded) */}
                                            <div style={{
                                                fontSize: 10,
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                color: typeColors[result.type],
                                                background: `${typeColors[result.type]}15`,
                                                padding: '4px 10px',
                                                borderRadius: 999,
                                                flexShrink: 0
                                            }}>
                                                {typeLabels[result.type]}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* No results */}
                    {!isLoading && itemCount === 0 && highlightText.trim() && (
                        <div style={{
                            padding: 24,
                            textAlign: 'center',
                            color: '#6B7280',
                            fontSize: 14
                        }}>
                            {translations.search.noResults} "{highlightText}"
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SearchDropdown;
