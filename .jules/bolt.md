## 2024-05-18 - Throttling High-Frequency Map Events
**Learning:** Attaching React state updates directly to MapLibre's `move` and `mousemove` events causes catastrophic re-renders. Because MapLibre fires these events continuously (often >60fps) during interactions, synchronous React state dispatch functions like `setCoordinates` overwhelm the main thread and drop frames, especially on low-end hardware.
**Action:** Always throttle continuous map events (e.g., using `performance.now()` and `useRef` to limit to ~20fps/50ms) before triggering any React state changes or heavy calculations.
