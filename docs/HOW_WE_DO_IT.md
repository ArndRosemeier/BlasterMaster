# How we do it

Living catalog. Update this file in the **same change** when you introduce or change a pattern.

## Index (entry points)

| Module | Purpose |
|--------|---------|
| `src/main.ts` | Creates `Phaser.Game` after `document.fonts.ready` |
| `src/game/config.ts` | Typed `GameConfig` (1280×720, title + play) |
| `src/game/engine/` | Canonical board, `applyMove`, `applyTurn`, outcomes |
| `src/game/ai/` | Heuristic opponent — only calls `applyTurn` |
| `src/game/ops/` | Campaign, stars, progress, play session data |
| `src/game/audio/bank.ts` | Catalog of SFX / title clip paths and gains |
| `src/game/audio/bus.ts` | Sample bank + Web Audio playback (`public/assets/sfx`) |
| `src/game/maps.ts` | Occupancy-row maps (`#` / `=` / `.`) → orthogonal graphs |
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
- **Campaign is a wrapper.** Missions pick map + difficulty + star thresholds. Progress is Zod-parsed `localStorage` (`loadProgress` throws on junk; the title may reset via `loadProgressOrReset`).
- **Maps are graphs.** `#` is a cell, `=` is a pending wall plate, `.` is void. Neighbors are orthogonal live cells only. Isolated cells and orphan walls throw at `createBoard`.
- **Waves are simultaneous.** Snapshot every critical cell, subtract degree, then apply all outgoing tokens. Leftover stays. After the dump, every wall orthogonally beside an exploded cell becomes an empty unowned cell and the graph is rewired. The blast that opens a door does not travel through it.
- **Painted world, procedural board.** Backgrounds live in `public/assets` and load through `publicAsset()` so subdirectory deploys (`/BlasterMaster/`) resolve. Cells, cores, and HUD are Phaser graphics/text so they can tween.
- **SFX are files, bus is the owner.** Clips live in `public/assets/sfx` (Sound Studio WAVs). `src/game/audio/bank.ts` is the catalog; `bus.ts` decodes and plays them. Title melody loops from the same bank after the first gesture. Do not add a second audio path or a synth fallback.
- **Juice is presentation-only.** Gem cores, orbit, shockwaves, and flights live in `src/scenes/play/fx.ts` + `BoardView`. They decorate engine snapshots and never invent a wave.
- **Layout is testable.** Cell positions come from `src/game/view/layout.ts`, not from ad-hoc scene math.
- **Hover flood is `applyMove`.** `previewPlacement` asks the engine what the first wave would do, including first-wave wall falls. The scene never invents dumps, leftover, or collapses.
- **Deploy is subdirectory Vite.** `BLASTER_MASTER_BASE` (default `/BlasterMaster/`) is the Vite `base`. `deploy-sync.ps1` builds, patches `RewriteBase`, syncs `dist/`, uploads `/shots/BlasterMaster.png`, and registers the Futuremagic manifesto. Do not store the FTP password in the repo.

## Anti-patterns

- **No `any`** — use unknown + Zod / type guards at boundaries
- **No duplicate helpers** — search `src/lib` and `src/game` before inventing
- Do not reverse dependency direction (lib must not import scenes)
- Do not explode cells inside a scene; only play engine wave events
- Do not put readable text in generated images — composite copy in Phaser
- Do not add portals, shields, splash radius, or a second explode rule — walls are pending cells, not a new physics
- Do not load `public/` files with a root-absolute `/assets/...` URL — that breaks subdirectory hosting
