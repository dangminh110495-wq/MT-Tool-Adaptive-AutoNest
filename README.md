# MT-Tool T50 — Adaptive Auto Nest

Public community-review repository for the **Adaptive Auto Nest** solver from MT-Tool T50.

The goal is to improve irregular 2D sheet-metal nesting so the solver keeps generating meaningfully different layouts, preserves the exact-valid best-so-far, escapes local optima, discovers complementary polygon pairings/clusters, and closes the final stock sheet more reliably.

## What T50 already does

- exact polygon legality validation before accepting a champion;
- TRUE-NFP-based placement/search;
- seeded local refinement and global portfolio search;
- destroy/repair-style refinement;
- anti-stall logic and explicit last-sheet closure/ejection attempts;
- per-job exact-valid champion persistence;
- hybrid fast-seed handoff when available, with JavaScript fallback.

## Current objective order

1. Place all required parts legally.
2. Minimize stock span / sheet count.
3. Maximize a clean rectangular remnant (`remainW`) on the last used sheet.
4. When tied, move material off the last sheet.
5. Reduce earlier-sheet unused width, internal void, cavities and ragged frontier.

## Main areas where help is wanted

- multi-start diversification and elite diversity;
- complementary pair/cluster discovery for triangles and concave polygons;
- ALNS destroy/repair operators and adaptive operator weighting;
- ejection chains / k-part relocation across earlier sheets;
- stronger last-sheet closure operators;
- NFP/collision caching and runtime improvements;
- deterministic seeded portfolios and plateau-triggered restarts;
- objective/acceptance logic that favors structural improvement over cosmetic polishing;
- reproducible benchmark cases.

## Important files

- `src/quality-objective.js` — actual T50 quality/scoring comparator excerpt.
- `src/champion-retention.js` — actual validated best-so-far persistence / safe-partial excerpt.
- `src/review/exact-validation.js` — final exact manufacturing-validity gate used before accepting candidates.
- `src/review/true-nfp-contact-core.js` — TRUE-NFP construction/cache, exact pair checking, feasible-region contacts and contact snapping.
- `src/review/last-sheet-closure-ejection.js` — target-strip removal, last-sheet closure and bounded ejection/reinsertion chain.
- `src/review/global-portfolio-search.js` — exact pair variants, full-sheet multi-start rebuilding, elite portfolio and champion polish loop.
- `src/review/master-specialist.js` — worker bridge that seeds local/global TRUE-NFP lanes and only accepts exact-valid quality improvements.
- `src/review/adaptive-handoff.js` — fast-seed → TRUE-NFP handoff, plateau/hard-cap logic and partial-safe baseline behavior.
- `docs/CODEMAP.md` — map of the important functions/areas in the original T50 source.
- `COMMUNITY_REQUEST.md` — detailed optimization request and current failure modes.
- `.github/ISSUE_TEMPLATE/optimization-request.md` — template for proposed Auto Nest improvements.
- `SANITIZATION.md` — what must be removed/replaced before a full-tool copy is public.

> Files under `src/review/` are deliberately focused review excerpts rather than standalone modules. They preserve the real T50 algorithmic code while avoiding unrelated UI/application code and public exposure of personal/project-specific data.

## Non-negotiable validity

A candidate may search aggressively, but an accepted best solution must remain manufacturing-valid: inside stock edge, no illegal overlap, required gap/min-web respected, only allowed rotation/mirroring, correct quantities, and stock order/limits respected.

See **Issue #1 — Help wanted: improve Adaptive Auto Nest quality, diversification and last-sheet closure** for the concrete optimization targets and contribution ideas.
