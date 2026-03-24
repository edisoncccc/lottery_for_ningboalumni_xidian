# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A live lottery/raffle system built for the Xidian University Ningbo Alumni New Year banquet ("向阳·向蔚来"). Pure static frontend — HTML/CSS/JS with no build tools, no framework, no dependencies.

## Running

Open `index.html` directly in a browser (Chrome/Edge recommended). Press F11 for fullscreen. No build step, no server required.

For local development with a server: `npx serve .` or `python -m http.server`.

## Architecture

Three files make up the entire app:

- `index.html` — page structure with semantic sections: header, prize display, lottery rolling area, winner list, navigation controls, and two fixed sidebars (prize list left, all winners right)
- `style.css` — dark neon theme with CSS custom properties in `:root`, keyframe animations (fireworks, falling elements, winner glow, name pulse), responsive breakpoints that hide sidebars below 1200px width
- `script.js` — all application logic in a single file:
  - `attendants[]` array and `prizeConfig[]` array are the data sources (edit these to customize)
  - State: `currentPrizeIndex`, `isRolling`, `remainingAttendants`, `allWinners` (keyed by prize name)
  - `localStorage` persistence via `saveState()`/`loadState()` — survives page refresh
  - `secureRandom()` uses `crypto.getRandomValues()` with modulo bias elimination
  - Keyboard shortcuts: Space (start/stop), Left/Right arrows (switch prize)

## Key Design Decisions

- Winners are removed from `remainingAttendants` on draw — no duplicates possible across all prize rounds
- Prize rounds are sequential (三等奖 → 马不停蹄奖 → 二等奖 → ... → 特等奖) but navigable via prev/next buttons
- Fireworks use `DocumentFragment` for batch DOM insertion to reduce reflow
- Background music auto-plays on first user click interaction
- All UI text is in Chinese (zh-CN)

## Customization

To adapt for a different event, modify two arrays in `script.js`:
1. `attendants` (line ~21) — participant name list
2. `prizeConfig` (line ~34) — prize definitions with `name`, `desc`, `count`, `icon`

Update the title/subtitle in `index.html` header section accordingly.
