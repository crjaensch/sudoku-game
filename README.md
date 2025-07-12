# Sudoku Game – Classic & Killer

A lightweight, vanilla-JS web app for playing two popular Sudoku variants:

* **Classic Sudoku** – the traditional 9 × 9 puzzle with row/column/block rules.
* **Killer Sudoku** – same grid, but adds dashed “cages” with sum constraints.

The UI is intentionally minimal: plain HTML/CSS/JS, no build step, fast to load and easy to hack.

---

## Features

* One-click switch between Classic and Killer modes.
* Difficulty levels (Easy / Medium / Hard) drawn from an in-file catalogue.
* Helper buttons – _Solve Row / Column / Block_ – work in both modes.
* Real-time conflict highlighting to catch mistakes instantly.
* Killer mode sums & cage borders rendered dynamically from the solution.

## Quick Start

1. Clone the repo

```bash
git clone <your-fork-url>
cd sudoku-game
```

2. Open `sudoku.html` in any modern browser.  No build tools, servers or packages required.

That’s it!  The game runs entirely client-side.

## File Overview

| File | Purpose |
|------|---------|
| `sudoku.html` | Single-page UI, mode selector, global initialisation. |
| `game_catalog.js` | Catalogue of 18 sample puzzles (`PUZZLES` global). |
| `classic_game_logic.js` | Grid rendering, classic helpers & conflict checker. |
| `killer_game_logic.js` | Adds cage layout, Killer conflict logic & helpers. |
| `README.md` | You’re reading it. |

## Adding Puzzles

Append new objects to `PUZZLES` in `game_catalog.js`, e.g.

```js
{ level: 'hard', solution: '…81-digit-string…' }
```

The app auto-generates a playable puzzle by hiding clues according to the selected difficulty.

## Customising Killer Cages

Static cage layout lives at the top of `killer_game_logic.js` (`STATIC_CAGE_LAYOUT`).  Each cage is a list of cell IDs in `R{row}C{col}` format.  Sums are computed automatically from the active puzzle’s solution.

## Development Notes

* Vanilla JS keeps the codebase small (<500 LOC).
* Mode switches fully reset global state to avoid cross-mode artefacts.
* All functions are documented with concise JSDoc comments.

## Roadmap / Ideas

* Mobile-friendly layout.
* “Check” button for Killer mode (currently alerts *Not implemented*).
* Optional auto-solve / hint generator.
* Import/export puzzles via JSON.

Pull requests and suggestions welcome—have fun puzzling!
