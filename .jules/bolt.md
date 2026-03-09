
## 2025-03-09 - MapLibre Events State Coupling
**Learning:** Connecting high-frequency MapLibre events like `mousemove` and `move` directly to React state updates causes severe performance degradation, blocking the main thread, and producing UI stuttering due to excessive re-rendering (~60fps triggers).
**Action:** Always throttle continuous map events (e.g., using `useRef` and a 50ms `setTimeout`) before linking them to React state (`onCoordinatesChange`). Implement a trailing-edge execution (via a timeout fallback) to guarantee that the final precise coordinates are captured after the movement stops.
