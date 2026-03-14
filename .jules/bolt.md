
## 2025-03-14 - Throttle MapLibre Events to Reduce React Renders
**Learning:** React components without `React.memo` (like `Overlay` and `MapContainer`) will cascade re-renders if high-frequency state (like map coordinates) is updated continuously. Tying map `move`/`mousemove` directly to `setState` in a parent component tanks performance and leads to jank.
**Action:** Throttle high-frequency map events to ~20FPS (50ms) using a `useRef` timer before propagating them to React state. Ensure trailing-edge updates and cleanup on `moveend` to prevent stale data.

## 2025-03-14 - Anti-Pattern: setTimeout in useEffect for State Deferral
**Learning:** Attempting to manually defer state updates in `useEffect` using `setTimeout(..., 0)` to avoid "synchronous updates during render" is an anti-pattern. It can lead to race conditions causing the entire React tree to fail to render (blank white screen).
**Action:** Trust React's `useEffect` lifecycle. Standard `setTimeout` debouncing with proper cleanup is sufficient and safe.
