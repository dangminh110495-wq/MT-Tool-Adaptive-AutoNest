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

- `adaptive-autonest-t50-review-excerpt.js` — focused review excerpt from the T50 Auto Nest implementation (not standalone).
- `docs/CODEMAP.md` — map of the important functions/areas in the original T50 source.
- `COMMUNITY_REQUEST.md` — detailed optimization request and current failure modes.
- `.github/ISSUE_TEMPLATE/optimization-request.md` — template for proposed Auto Nest improvements.
- `SANITIZATION.md` — what was removed/replaced before public sharing.

> The original MT-Tool HTML is a large single-file application. Personal contact/donation details and a project-specific cloud endpoint must be sanitized before any full-tool copy is published. This repository is intended to keep the public review surface focused on Adaptive Auto Nest.

## Non-negotiable validity

A candidate may search aggressively, but an accepted best solution must remain manufacturing-valid: inside stock edge, no illegal overlap, required gap/min-web respected, only allowed rotation/mirroring, correct quantities, and stock order/limits respected.

See the open **Help wanted** issue for the concrete optimization targets and contribution ideas.
