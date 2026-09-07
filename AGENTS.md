# BlasterMaster — Agent Guide

Revive of the classic Blaster Master as a TypeScript web game for Cursor.

**Later path on Windows:** `C:\Projekte\BlasterMaster`

## Stack

- **Vite** + **Phaser 3** + **TypeScript** + **Vitest**
- Package manager: **npm** (Windows machine; do not assume pnpm/bun)

## Exact commands (npm)

```bash
npm install
npm run dev          # Vite dev server
npm run build        # typecheck + production build
npm run preview      # preview dist
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint flat config
npm run test         # vitest run
npm run test:watch   # vitest watch
npm run format       # eslint --fix
```

## Quality bars

- Strict TypeScript (`strict`, `noUncheckedIndexedAccess`); **no `any`**
- Search the repo before inventing helpers; reuse `src/lib`
- When you change a pattern, update `docs/HOW_WE_DO_IT.md` in the same change
- Prefer Zod at env / external boundaries (`src/env.ts`)

## Done = green verify loop

A change is done when **typecheck + lint + test** all pass:

```bash
npm run typecheck && npm run lint && npm run test
```

## Docs map

- `docs/ARCHITECTURE.md` — folders, dependency direction, where new code goes
- `docs/HOW_WE_DO_IT.md` — living catalog of patterns / anti-patterns
- `AGENTS.md` (this file) — commands and quality bars for agents

## Boundaries

- **Ask first** before adding new dependencies
- **Never** put secrets in chat, commits, or source; use `.env` (gitignored) from `.env.example`
- Optional later: Cursor stop-hook for verify loop — add `.cursor/hooks.json` only when schema is confirmed; skip until then

## First entry points

- `src/main.ts` — Phaser bootstrap
- `src/game/config.ts` — `GameConfig`
- `src/scenes/TitleScene.ts` — title placeholder
