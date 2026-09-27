# How we do it

Living catalog. Update this file in the **same change** when you introduce or change a pattern.

## Index (entry points)

| Module | Purpose |
|--------|---------|
| `src/main.ts` | Creates `Phaser.Game` after `document.fonts.ready` |
| `src/game/config.ts` | Typed `GameConfig` (1280×720, title + play) |
| `src/game/engine/` | Canonical board, `applyMove`, `applyTurn`, outcomes |
| `src/game/ai/` | Heuristic opponent — derives from the rule primitives, only calls `applyTurn` |
| `src/game/ops/` | Campaign, stars, progress, play session data |
| `src/game/audio/bank.ts` | Catalog of SFX / title clip paths and gains |
| `src/game/audio/bus.ts` | Sample bank + Web Audio playback (`public/assets/sfx`) |
| `src/game/maps.ts` | Occupancy-row maps (`#` / `*` / `=` / `.`) → orthogonal + deep diagonal graphs |
| `src/game/theme.ts` | Reactor palette and player colors |
| `src/game/view/layout.ts` | Pure board layout (no Phaser) |
| `src/scenes/TitleScene.ts` | Operations / skirmish menu |
| `src/scenes/PlayScene.ts` | Presentation of engine snapshots + AI turns |
| `src/scenes/play/fx.ts` | Generated core/glow textures, blasts, token flights |
| `src/env.ts` | Zod parse of optional `VITE_*` env |
| `src/lib/clamp.ts` | Shared util + Vitest |
| `src/lib/rng.ts` | Deterministic `mulberry32` for AI tests |
| `src/lib/publicAsset.ts` | Vite `BASE_URL` prefix for `public/` files |
| `deploy-sync.ps1` | Incremental FTP deploy to futuremagic.de |

## Patterns

- **Engine owns rules.** `applyMove` / `applyTurn` are the only state transitions. Scenes render `afterPlacement` + `waves` and never re-simulate explosions.
- **AI is a wrapper.** `chooseAiMove` scores legal `applyTurn` results. It must not write cells itself.
- **The AI derives from the rule primitives.** `src/game/ai/evaluate.ts` values a position per owned cell with `pressure = count / threshold(cell)` (how close to detonating) and `reach = blastTargets(cell).length`, plus `isNearCritical(cell)` — never from `neighbors`/`diagonals`/`deep` and never from a degree constant, so the same count on a deep cell is worth less because the rule says it fires later. **The guard is eslint-enforced in two scopes:** non-test source repo-wide may not read `.neighbors`/`.diagonals` — the one home, `src/game/engine/board.ts`, and `**/*.test.ts` are exempt — and `src/game/ai/**` may not read `.deep` either, because `.deep` is a display flag the view legitimately reads. So a spread change reaches the AI through the primitives, and a re-derivation of the geometry cannot land outside its one home.
- **Campaign is a wrapper.** Missions pick map + difficulty + star thresholds. Progress is Zod-parsed `localStorage` (`loadProgress` throws on junk; the title may reset via `loadProgressOrReset`).
- **Maps are graphs.** `#` is a cell, `*` is a deep cell, `=` is a pending wall plate, `.` is void. `neighbors` is always the orthogonal live cells; `diagonals` is non-empty only for deep cells. Isolated cells and orphan walls throw at `createBoard` — a wall is legal if it touches a live cell orthogonally, or a deep cell diagonally.
- **One explode rule: threshold is out-degree.** A cell detonates at `threshold(cell)` (= `neighbors.length + diagonals.length`) and dumps exactly one token into every `blastTargets(cell)`. A deep cell is not a second rule — it just fires into the diagonals too, so it counts diagonals toward its threshold. Interior deep = 8 in, 8 out; corner deep = 3. **Threshold must always equal outgoing edges or the cascade would create tokens from nothing and never terminate.** `threshold`, `blastTargets`, `isCritical`, and `isNearCritical` are the only places that know this; never re-derive it from `neighbors.length` outside `src/game/engine/board.ts` (eslint errors on it in non-test source; the one home and `**/*.test.ts` are exempt).
- **Waves are simultaneous.** Snapshot every critical cell, subtract its threshold, then apply all outgoing tokens. Leftover stays. After the dump, every wall orthogonally beside an exploded cell — or diagonally beside an exploded **deep** cell — becomes an empty unowned cell (deep-ness is map-authored, so a fallen plate is always a plain cell) and the graph is rewired. The blast that opens a door does not travel through it.
- **Painted world, procedural board.** Backgrounds live in `public/assets` and load through `publicAsset()` so subdirectory deploys (`/BlasterMaster/`) resolve. Cells, cores, and HUD are Phaser graphics/text so they can tween.
- **SFX are files, bus is the owner.** Clips live in `public/assets/sfx` (Sound Studio WAVs). `src/game/audio/bank.ts` is the catalog; `bus.ts` decodes and plays them. Title melody loops from the same bank after the first gesture. Do not add a second audio path or a synth fallback.
- **Juice is presentation-only.** Gem cores, orbit, shockwaves, and flights live in `src/scenes/play/fx.ts` + `BoardView`. They decorate engine snapshots and never invent a wave.
- **Layout is testable.** Cell positions come from `src/game/view/layout.ts`, not from ad-hoc scene math. Menu grids use `cardGrid`, which reproduces the plain `firstX + col * pitchX` grid for full rows and centers a short last row — so a tenth map card still fits.
- **Reach is drawn, not described.** Each gauge pip sits on the edge it fires through (cardinals for plain cells, plus the corners for deep cells), so pip count is the threshold and pip position is the reach. `reachPips(cell, size)` in `src/game/view/layout.ts` is the pure, tested source of those positions; `BoardView` only draws them and rebuilds them when a fallen plate rewires a cell's edges. Deep cells also carry cut corners in `theme.colors.deep`, a marker that survives every owner/hover/near-critical hue. `previewPlacement` reads engine transfers, so the hover preview shows diagonal dumps for free.
- **Hover flood is `applyMove`.** `previewPlacement` asks the engine what the first wave would do, including first-wave wall falls. The scene never invents dumps, leftover, or collapses.
- **Deploy is subdirectory Vite.** `BLASTER_MASTER_BASE` (default `/BlasterMaster/`) is the Vite `base`. `deploy-sync.ps1` builds, patches `RewriteBase`, syncs `dist/`, uploads `/shots/BlasterMaster.png`, and registers the Futuremagic manifesto. Do not store the FTP password in the repo.

## Anti-patterns

- **No `any`** — use unknown + Zod / type guards at boundaries
- **No duplicate helpers** — search `src/lib` and `src/game` before inventing
- Do not reverse dependency direction (lib must not import scenes)
- Do not explode cells inside a scene; only play engine wave events
- Do not re-derive the rule geometry outside `src/game/engine/board.ts` — read `threshold`/`blastTargets`/`isCritical`/`isNearCritical`. `eslint.config.js` errors on `.neighbors`/`.diagonals` in non-test source (the one home and `**/*.test.ts` are exempt) and on `.deep` inside `src/game/ai/**`
- Do not put readable text in generated images — composite copy in Phaser
- Do not add portals, shields, splash radius, or a second explode rule — walls are pending cells, not a new physics. Deep cells pass this bar: same rule, wider out-degree. A cell that fires into more directions than it counts would break token conservation.
- Do not load `public/` files with a root-absolute `/assets/...` URL — that breaks subdirectory hosting
