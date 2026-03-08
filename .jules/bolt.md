## 2025-03-08 - [Throttling Map Events]
**Learning:** High-frequency MapLibre events (like `move` and `mousemove`) can fire continuously and trigger excessive React re-renders when directly linked to state, blocking the main thread and severely dropping performance, especially on lower-end devices.
**Action:** Always implement throttling (e.g., using `setTimeout` at ~50ms/20fps) with a trailing-edge execution on rapid map events before passing the data to React state update functions like `onCoordinatesChange`.
