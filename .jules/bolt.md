## YYYY-MM-DD - [Title]
**Learning:** [Insight]
**Action:** [How to apply next time]

## 2024-05-24 - Map Event Throttling Optimization
**Learning:** Connecting rapid map events (like `mousemove` or `move`) directly to React state updates causes excessive re-renders and degrades performance, especially since the coordinates are used to update UI elements like the coordinates display.
**Action:** Use requestAnimationFrame or a throttle/debounce mechanism to limit the frequency of state updates triggered by these high-frequency events, while ensuring the final position is always captured.
