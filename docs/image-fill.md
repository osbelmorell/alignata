# Art fill (Oct 12 2026)

## Root cause
All 41 sticker masters are 1920x1080 (16:9). Slots were not:
- Phone/tablet (<900px) card slots and the base story hero were `aspect-ratio: 4 / 3` -> with `object-fit: contain` that left up to 40px (390) / 75px (768) pad-coloured bars top and bottom.
- Desktop feed heights were computed from the full column width, but the art has a 12px + 12px inset (restyle-c), so slots were 1.694:1 (paired) / 1.706:1 (lead) instead of 1.778 -> ~7px bars top and bottom.
- WebKit phones: in the flex-column card, WebKit derives the aspect-ratio height from the stretched width before the 12px side margins (350 wide -> 197 tall in a 326 slot), so even a 16:9 slot came out 1.656:1. Fixed with an explicit `width: calc(100% - 24px)` on phones.
- Baked-in whitespace: every master has 0-11% sticker margin (measured per file). It is part of the art, not the cause, and is kept.

## Fix
- Every art slot is exactly 16:9 of its real (inset) width: phone cards + story hero `aspect-ratio: 16 / 9`; desktop heights `((100cqi - 24px) / 2 - 24px) * 9/16` and `(7 cols + 6 gutters - 24px) * 9/16`.
- img and blur placeholder use `cover` with `object-position: var(--art-focus, 50% 50%)` (per-image focal hook; no overrides needed today).
- Slot ratio = art ratio, so cover crops only sub-pixel rounding. No art files edited.
- Rejected: 4:3 cover on phones (every master would lose 79-480px of width; faces/robots/props clipped).

## Checks
`scripts/assert-art-fill.mjs` (run by test:site): CSS contract, and with `ART_FILL_URL=<url>` + playwright, a rendered check that no visible art leaves a gap > 2px or is cover-cropped > 2px a side (Chromium + WebKit, 390/768/1280/1440).
