# QustomDot — Quantum Dot Inkjet Inks

A single-page, animated recreation of the QustomDot landing design.
Vanilla HTML / CSS / JS, no build step. Font: Roboto.

## Run it

Open `index.html` directly, **or** serve the folder:

```bash
node server.js          # http://localhost:5511
```

## Layout

The page is **three full-height panels**. Each screen is split: a **beige head**
(heading + the drifting colour wheel) on top, and a **full-width colour box** on the
bottom — roughly half and half.

1. **Hero** — title + the "At the forefront" box (pinned; the 3 images woosh past).
2. **Exceeding current standards** + the full-width ROHS grid box.
3. **Across all types of displays** + the full-width CTA / footer box.

## The effects

- **Colour wheel** (`.wheel`). Rebuilt from `Color Wheel.svg` (a red→orange→cream
  gradient behind a ring mask) so the gradient can animate: a rotating linear gradient
  (`@keyframes wheel-spin`) under a radial **ring mask** (`closest-side`, so it never
  crops on the edges). It's `position: fixed` (its plane never scrolls) and eases toward
  a scroll-driven target + cursor parallax, so it drifts slowly across the beige heads.
  The colour boxes are **frosted glass** (translucent + `backdrop-filter`), so the orb
  stays faintly visible as it passes behind them. Tune its path via the `KEYS` array in
  `script.js`.

- **Pinned hero woosh.** The hero is tall (`height: 260vh`); its inner pins with
  `position: sticky` while the three images — stacked on top of one another — woosh off
  to the left one at a time, clipped by the box border, revealing the next beneath
  (`updateSlider` in `script.js`).

## Images

Web-optimized copies of your photos live in `assets/` (resized/compressed from the
originals in the project root):

- `assets/hero-1.jpg`, `hero-2.jpg`, `hero-3.jpg` — the 3 hero woosh images
- `assets/product.jpg` — the centre image in the ROHS grid
- `assets/logo.png` — the QustomDot wordmark

To re-pick photos, swap the `src`s in `index.html`. The full-resolution originals
(`2021-05 *.jpg`, `logo.png`, `Color Wheel.svg`) are kept in the root as source.

## Colours (`:root` in `styles.css`)

| token | value | use |
|-------|-------|-----|
| `--cream` | `#fbead6` | page background |
| `--card-orange` / `--card-glass` | `#ec5e34` | "At the forefront" + CTA boxes |
| `--grid-orange` / `--grid-glass` | `#f4791f` | ROHS grid box |
| `--red` | `#e11d17` | "Get started" button |
| `--heading-grad` | red→orange→peach | the big gradient headings |
| `--wheel-grad` | red→orange→cream | the colour-wheel gradient |
