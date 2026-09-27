# Architecture

## Folders

| Path | Role |
|------|------|
| `src/main.ts` | Phaser.Game bootstrap |
| `src/game/` | Shared game config, engine, maps, theme |
| `src/game/engine/` | Pure rules: board, walls, move, hotseat session |
| `src/game/ai/` | Heuristic opponent over `applyTurn` |
| `src/game/ops/` | Campaign, scoring, progress, session DTOs |
| `src/game/audio/` | Sample catalog + Web Audio bus |
| `src/game/view/` | Pure presentation math (layout) |
| `src/scenes/` | Phaser scenes (screens) |
| `src/scenes/play/` | Play-scene view objects, generated core textures, blast FX |
| `src/lib/` | Pure shared utilities (no Phaser scene coupling) |
| `src/env.ts` | Zod-parsed `import.meta.env` |
| `public/assets/` | Generated backgrounds and SFX |

## Dependency direction

```
scenes  -->  game, lib
game    -->  lib  (and may import scene *classes* only for registration in config)
lib     -->  (nothing in scenes/game)
```

- Scenes may import from `src/game` and `src/lib`.
- Do **not** deep-import scene internals from `lib` or reverse the graph with circular imports.
- Prefer registering scenes in `src/game/config.ts`, not ad-hoc from utilities.

## Where new code goes

| Kind of change | Put it in |
|----------------|-----------|
| New screen / level | `src/scenes/YourScene.ts` + register in `game/config.ts` |
| Rules / board / win | `src/game/engine/` + tests beside the module |
| AI, campaign, stars | `src/game/ai/` or `src/game/ops/` — wrappers only |
| Shared game constants / theme | `src/game/` |
| Pure helpers (math, formatting) | `src/lib/` or `src/game/view/` + tests beside them |
| Env / feature flags | `src/env.ts` (Zod) |

## Bootstrap today

1. `index.html` → `/src/main.ts`
2. `main.ts` waits for fonts, then constructs `Phaser.Game(gameConfig)`
3. `gameConfig` is 1280×720 and starts `TitleScene`, then `PlayScene`
