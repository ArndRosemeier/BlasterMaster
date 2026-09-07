# How we do it

Living catalog. Update this file in the **same change** when you introduce or change a pattern.

## Index (entry points)

| Module | Purpose |
|--------|---------|
| `src/main.ts` | Creates `Phaser.Game` after `document.fonts.ready` |
| `src/game/config.ts` | Typed `GameConfig` (1280×720, title + play) |
| `src/game/engine/` | Canonical board, `applyMove`, `applyTurn`, outcomes |
| `src/game/maps.ts` | Occupancy-row maps → orthogonal graphs |
| `src/game/theme.ts` | Reactor palette and player colors |
| `src/game/view/layout.ts` | Pure board layout (no Phaser) |
| `src/scenes/TitleScene.ts` | Title + map select |
| `src/scenes/PlayScene.ts` | Hotseat presentation of engine snapshots |
| `src/env.ts` | Zod parse of optional `VITE_*` env |
| `src/lib/clamp.ts` | Example shared util + Vitest |

## Patterns

- **Engine owns rules.** `applyMove` / `applyTurn` are the only state transitions. Scenes render `afterPlacement` + `waves` and never re-simulate explosions.
- **Maps are graphs.** A map is a set of `{x,y}` cells. Neighbors are existing orthogonal neighbors. Isolated cells throw at `createBoard`.
- **Waves are simultaneous.** Snapshot every critical cell, subtract degree, then apply all outgoing tokens. Leftover stays.
- **Painted world, procedural board.** Backgrounds live in `public/assets`. Cells, cores, and HUD are Phaser graphics/text so they can tween.
- **Layout is testable.** Cell positions come from `src/game/view/layout.ts`, not from ad-hoc scene math.

## Anti-patterns

- **No `any`** — use unknown + Zod / type guards at boundaries
- **No duplicate helpers** — search `src/lib` and `src/game` before inventing
- Do not reverse dependency direction (lib must not import scenes)
- Do not explode cells inside a scene; only play engine wave events
- Do not put readable text in generated images — composite copy in Phaser
