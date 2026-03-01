import React from 'react';
import { Plus, Minus, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';
import './ZoomControl.css';
import { springs, variants } from '../../utils/animations';
import type { Translation } from '../../utils/translations';

interface ZoomControlProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onLocateMe?: () => void;
    translations?: Translation;
}

/**
 * ZoomControl - Rounded pill buttons for map interaction
 * Order from top to bottom: Zoom+, Zoom-, Locate
 */
const ZoomControl: React.FC<ZoomControlProps> = ({ onZoomIn, onZoomOut, onLocateMe, translations }) => {
    const t = translations?.controls || { zoomIn: 'Zoom In', zoomOut: 'Zoom Out', locateMe: 'Locate Me' };

    return (
        <div className="zoom-control-container" role="group" aria-label="Map zoom controls">
            <motion.button
                className="zoom-btn"
                onClick={onZoomIn}
                whileTap={variants.popOut.tap}
                whileHover={variants.popOut.hover}
                transition={springs.soft}
                title={t.zoomIn}
                aria-label={t.zoomIn}
            >
                <Plus size={22} />
            </motion.button>

            <motion.button
                className="zoom-btn"
                onClick={onZoomOut}
                whileTap={variants.popOut.tap}
                whileHover={variants.popOut.hover}
                transition={springs.soft}
                title={t.zoomOut}
                aria-label={t.zoomOut}
            >
                <Minus size={22} />
            </motion.button>

            {onLocateMe && (
                <motion.button
                    className="zoom-btn"
                    onClick={onLocateMe}
                    whileTap={variants.popOut.tap}
                    whileHover={variants.popOut.hover}
                    transition={springs.soft}
                    title={t.locateMe}
                    aria-label={t.locateMe}
                >
                    <Navigation size={22} />
                </motion.button>
            )}
        </div>
    );
};

export default ZoomControl;
