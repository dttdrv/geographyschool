
## 2024-03-06 - Avoid redundant array loops and string allocations in offline search
**Learning:** In tight loops running over thousands of records (e.g. offline search on every keypress), recalculating derived values like string length, `.slice(0,-1)`, and calling `.toLowerCase()` unconditionally can significantly drop FPS. Object recreation like `typeScores` inside the loop also causes excessive garbage collection pressure.
**Action:** Always hoist derivations (like `prefix` and lengths), move constant objects outside the loop, and use lazy evaluations (`if (match) {} else if (alt_prop) { ... }`) to reduce CPU cycles in intensive loops.
