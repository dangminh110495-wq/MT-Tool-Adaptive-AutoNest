# Adaptive Auto Nest T50 — code map

Line numbers refer to the public HTML before later edits.

## Objective / scoring
- `ncNpAutoQuality(res, tpl)` around line 17256.
- `ncNpAutoQualityCmp(a, b)` immediately after it.
- Ranking prioritizes: failed → stock gaps → sheet span → larger last-sheet remnant → less last-sheet area → less earlier-sheet unused width → void/cavity/frontier cleanup.

## Exact legality
- `ncNpValidateAutoCandidateExact(run, cand)` around line 38183.
- Aggressive search is welcome, but a candidate should only become champion after this gate passes.

## TRUE-NFP / portfolio search
- Core T50 / TRUE-NFP specialist area is roughly lines 38790–40065.
- `ncNpStartT21MasterSpecialist(run, options={})` around line 40010.
- Supports seeded refinement, tail-first closure, partial refinement and portfolio/global search.

## Adaptive handoff / anti-stall
- Hybrid handoff begins around line 40255.
- Plateau detection can switch from fast seed into TRUE-NFP refinement.
- UI is relabeled `Adaptive Auto Nest` around line 40456 and explicitly advertises champion retention, anti-stall and last-sheet closure/ejection.

## Persisted champion
- `mtT49SafeSubset`, `mtT49JobSignature`, `mtT49LoadChampion`, `mtT49SaveChampion` are near the end.
- End build tag: `T50-ANTI-STALL-LAST-SHEET-CLOSURE`.

## Practical symptoms to solve
1. Repeated runs can produce different layouts but do not reliably converge to the strongest one.
2. Search can plateau and over-polish instead of restructuring.
3. Human-obvious complementary pairings may be missed.
4. Eliminating the final sheet often needs coordinated reshuffling of earlier sheets.
5. Longer runtime does not always produce a better champion.
