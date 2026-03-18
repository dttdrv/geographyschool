## 2024-03-24 - Unnecessary React re-renders due to continuous map state updates
**Learning:** Linking fast continuous MapLibre updates (`move` or `mousemove`) directly to React state (`onCoordinatesChange({ lat, lng, zoom })`) in `App.tsx` triggers extremely expensive re-renders across the entire UI tree. Components like `Overlay` and `MapContainer` are forced to re-render for every single pixel moved.
**Action:** Throttle or debounce these high-frequency events at the source (`MapContainer.tsx`) using `useRef` to ~20fps/50ms to drastically improve map panning/zooming performance.
