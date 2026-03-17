
## 2024-05-17 - MapLibre Events Throttling
**Learning:** Continuous MapLibre events like `move` and `mousemove` fire at high frequency. Connecting them directly to React state updates causes excessive application-wide re-renders, impacting FPS and performance, particularly when the components wrapped are not memoized.
**Action:** Throttle these events (e.g., using a 50ms / ~20fps window) via a ref-based timeout. Always include trailing-edge execution and ensure proper cleanup of the timeout upon component unmount to prevent race conditions and memory leaks. Avoid `setTimeout(..., 0)` in `useEffect` for state update delays as it can cause UI blank screen race conditions.
