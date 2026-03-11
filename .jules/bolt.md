## 2024-05-15 - [Extracted typeScores to module level]
**Learning:** High-frequency search loops were allocating the `typeScores` object on every iteration, causing unnecessary memory allocation and garbage collection overhead.
**Action:** Always extract static configuration objects and non-reactive helper functions outside of loops and React components to prevent memory re-allocation and garbage collection overhead.
