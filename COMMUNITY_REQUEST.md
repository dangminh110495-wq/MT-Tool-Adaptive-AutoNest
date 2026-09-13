# Help wanted: improve Adaptive 2D irregular nesting (TRUE-NFP + ALNS / last-sheet closure)

I am developing an offline browser-based 2D irregular nesting tool for sheet metal. The current T50 solver works, but it still gets trapped in local optima and repeated runs do not reliably converge to the best layout.

The focused review excerpt is `adaptive-autonest-t50-review-excerpt.js`.

## Current solver
- exact polygon legality validation;
- NFP-based placement/search;
- seeded local refinement and global portfolio search;
- destroy/repair-style refinement;
- anti-stall logic;
- explicit last-sheet closure/ejection attempts;
- per-job exact-valid best-so-far champion persistence;
- objective: all parts placed → fewer sheets → larger clean rectangular last-sheet remnant → lower void/cavity/frontier waste.

## Problems I want help with
1. **Insufficient diversification** — many starts collapse into similar structures.
2. **Local-optimum plateau** — too much cosmetic polishing instead of structural moves.
3. **Complementary pairing/cluster misses** — e.g. triangles/concave parts a human can interlock better.
4. **Last-sheet closure is unreliable** — often needs ejecting a group, repacking earlier sheets, then reinserting globally.
5. **More time is not always better** — runtime does not consistently improve the champion.

## Feedback / PRs especially welcome on
- ALNS operators and adaptive operator weighting;
- ejection chains / k-part relocation / ruin-and-recreate;
- beam/MCTS around the last-sheet frontier;
- geometric pair/cluster precomputation from NFP contact states;
- elite diversity metrics / duplicate suppression;
- plateau-triggered restart policies;
- deterministic seeded multi-start portfolios;
- NFP/collision cache design;
- lexicographic/Pareto objective improvements;
- reproducible benchmark cases.

## Non-negotiable
Any accepted best candidate must remain manufacturing-valid: inside stock edge, no illegal overlap, required spacing/min-web, allowed rotation/mirror only, correct quantity, stock limits/order respected.

If proposing a change, please explain **what local optimum it targets, what operator/search state changes, and which metric should improve**.
