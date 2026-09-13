# Benchmark 001 — PL-10-Q355B / 2526 parts

This is a real production-style stress case captured from MT-Tool and intended to test whether Adaptive Auto Nest can escape its current 9-sheet local optimum.

## Input

- Task: `PL-10-Q355B`
- Material: Q355B
- Thickness: 10 mm
- Part types: 366
- Required quantity: 2526 / 2526 parts
- Stock: 6000 × 1500 mm
- Available sheets in the saved project: 10
- Gap: 5 mm
- Edge margin: 3 mm
- Rotation: free
- Mirror: allowed
- Part-in-part: allowed
- Auto remnant: enabled
- Remnant minimum: 500 × 500 mm

## Current T50 baseline

The captured Adaptive Auto Nest run reports **9 used sheets**, with the 10th stock sheet empty.

Placed-part counts by sheet:

`[64, 192, 225, 228, 254, 306, 300, 414, 543, 0]`

All 2526 required parts are placed.

The last used sheet occupies approximately `1864.025 mm` from the left edge, leaving an approximately full-height right-side remnant of `4135.975 mm`. This agrees with the runtime UI, which reported roughly `~4130 mm` remaining during the captured run.

Outer-contour area distribution is highly unbalanced: sheets 1–8 carry about **60.912 m²** of outer-contour area, while sheet 9 carries only about **2.165 m²**. Sheet 9 therefore contains many small parts but only about **24.1% outer-contour area utilization**.

## Why this is a useful benchmark

The interesting problem is not simply filling small holes. T50 has already produced eight comparatively dense sheets and then leaves 543 mostly-small parts on a lightly occupied ninth sheet. A stronger search should test structural moves across sheet boundaries: ejection chains, ruin/recreate, k-part relocation, cluster moves and last-sheet elimination.

The primary challenge is:

**Can an exact-valid solver move every part from sheet 9 into sheets 1–8 and close the job in 8 sheets?**

An 8-sheet result is not assumed to be feasible; it must pass the same exact manufacturing validation. If 8 sheets cannot be reached, the secondary objective is to increase the clean rectangular remnant on sheet 9 beyond the current ~4136 mm while preserving all 2526 parts and exact validity.

## Runtime evidence from the captured run

At the captured progress point:

- time budget: 225 s
- observed: 101.7 s / 225 s
- progress: 45%
- renest: 263
- exact: 27
- best updates: 13
- polish: 10
- UI best: 9 sheets, 2526/2526, remain ~4130 mm, clean ~4171 mm

The runtime dialog identifies the solver as `T50 · Global champion search` with Hybrid Search / exact validation and T50 anti-stall + last-sheet closure logic.

## Reproduction rule

A proposed improvement is only accepted when it:

1. places all 2526 required parts;
2. stays inside 6000 × 1500 stock with the configured 5 mm gap and 3 mm edge margin;
3. respects allowed rotation/mirror and quantities;
4. passes exact overlap / stock-boundary validation;
5. either reduces used sheets below 9, or improves the last-sheet remnant without worsening a higher-priority objective.

The original save project contained other material/thickness tasks as well. This public benchmark intentionally documents only the PL-10-Q355B case so unrelated project geometry is not exposed.
