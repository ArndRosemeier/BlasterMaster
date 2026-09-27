# Board — BlasterMaster orchestration

The chief of staff's memory that outlives its own session. **One screen, overwritten in
place.** A record that no longer describes the present belongs in `docs/DECISIONS.md`
or nowhere. It is **checked, never believed**:

```bash
npm run board     # → BOARD RECONCILED | BOARD STALE — fix docs/BOARD.md before dispatching
```

The project's own `AGENTS.md` and `docs/HOW_WE_DO_IT.md` are the authority for how code
is written here; this file is the authority for what is happening right now.

## Record vocabulary

| Prefix | Means |
|---|---|
| `reconciled:` | the commit the rest of this board was checked against (with a UTC stamp) |
| `SESSION` | an actor that may dispatch (id, role, state) |
| `IN-FLIGHT` | a writer: row, actor, worktree, branch, base, state, and the full scope |
| `LANDED` | a verified landing: row, sha, **the dispatcher's own verification numbers**, what was retired, the docs amended |
| `QUEUE` | requests and known debt not yet dispatched (with a reserved row number) |
| `TRAP` | a mistake that actually happened, and the rule that prevents it |
| `GUARD` | a mechanism protecting the process, and how to verify the mechanism itself |
| `RECOVERY` | where a successor finds everything it needs |

`row=` on a QUEUE/IN-FLIGHT/LANDED record is a **slice id on this board**, not a ledger row:
`docs/DECISIONS.md` numbers decisions independently and append-only. A brief names both, and a
record that spans a landing states its ledger rows explicitly.

Every record names something checkable — sha, branch, worktree, path. "Probably fine"
is not a record.

## Records

```
reconciled: 5ec65c391015caa6061b8c1646d45cb913b16a48 · 2026-09-27T15:25Z

SESSION | id=session-1e324382-bce8-42e4-a70d-a3e3fe31c6dc | role=chief-of-staff | state=active
  | note=designated by the owner 2026-09-27 ("please be my chief of staff"); one frozen goal
    (goal-ab88b5ce) created then PAUSED — never re-scoped, resumed or completed. Work is
    driven by WAKE EVENTS ONLY: an owner message, a writer's LANDED/BLOCKED report, or a
    runtime failure notice. A parked tick is not a work order and gets silence.

LANDED | row=1 | sha=ab2b552 | verify=DISPATCHER'S OWN full loop on exactly this tree:
  typecheck exit 0 · lint exit 0 · 65 tests / 12 files · build exit 0. `scripts/gate.sh` exists
  only from row=2, so row=1 is verified by the gated tip b475fd1, a descendant that touches
  no file row=1 introduced — the same 65 tests pass and every `src/` path is identical.
  | retired=nothing (self-authored, single-session) | note=the owner's deep-cell idea, built
  after the owner approved three forks: deep blasts drop diagonally touching walls; diagonal
  corner-cutting through wall corners is allowed; build it now.
  docs=docs/HOW_WE_DO_IT.md (one-explode-rule pattern, maps row, reach-drawn pattern,
  anti-pattern clause) + docs/DECISIONS.md rows 3-8.

LANDED | row=2 | sha=b475fd1 | verify=DISPATCHER'S OWN: `npm run gate` at the gated tip
  b475fd1 → exit 0 FULL GREEN: typecheck 0 · lint 0 · 65 tests / 12 files · build 0 (~15s),
  raw log .gate-logs/gate-20260927T151530Z-3864185.log. FOUR earlier runs of the gate chain
  are VOID or superseded and none is quoted as a result: two exit-9 LOCK refusals (both were
  the lock bug below, found by running the guard rather than reading the diff), one verdict
  whose only dirty path was the lock itself, and one superseded tip.
  | retired=worktree /home/administrator/projects/BlasterMaster/worktrees/probe · branch
  probe/worktree-guard (verified gone: `git worktree list` shows only the main tree and
  `git branch -a` only main)
  | note=the process itself: scripts/gate.sh (ONE gate: atomic lock, two tiers, raw log,
  dirty-tree warning, exit vocabulary 0/1/2/9), scripts/board.sh (this reconciler),
  docs/BOARD.md (this file), docs/DECISIONS.md (append-only ledger), `npm run gate` /
  `gate:compile` / `board`, and the worktree ignores (eslint worktrees/**, .gitignore
  worktrees/ + .gate-logs/ + .blastermaster-lock).
  The worktree guard was verified BY INJECTION, not by inspection: worktrees/probe (branch
  probe/worktree-guard, based on f807686) was poisoned with `export const poisoned: any` plus
  a failing test; in its OWN tree the gate went RED (lint exit 1 at 66 tests) and the main
  tree stayed GREEN at EXACTLY 65 — so a writer's half-finished tree cannot enter the
  dispatcher's gate.
  docs=AGENTS.md is unchanged deliberately — its commands, quality bars and "done" bar
  already match this process.

IN-FLIGHT | row=3 | writer=session-f65b232e-25f8-4fc5-bdb1-75417a413d9a
  | worktree=/home/administrator/projects/BlasterMaster/worktrees/ai-rule-derived
  | branch=feat/ai-rule-derived | base=47b7742 | dispatched_by=session-1e324382
  | state=dispatched 2026-09-27T15:2xZ, deps installed, no commit yet
  | note=OWNER'S ORDER, verbatim: "AI should work on a more fundamental level if it does not do
  so now. The same routines that steer how spread and explosions work should also be used by the
  AI so that changes here will automatically be used by the AI (avoid any code duplications,
  make everything resilient to code changes)".
  INTAKE CORRECTION (dispatcher, with evidence): the premise is already true for legality and
  simulation — `ai/choose.ts:1-2` imports `legalMoves` and `applyTurn`, and `ai/evaluate.ts:1`
  imports `nearCriticalCount`, which routes through the engine's `threshold()` — which is why
  the deep-cell landing `ab2b552` needed ZERO AI edits. A grep for
  `neighbors|diagonals|threshold|blastTargets` in `src/game/ai/` finds only array `.length`.
  What is still rule-BLIND is the JUDGEMENT: `evaluate.ts` hardcodes weights over features that
  know neither threshold nor reach, and nothing stops a future edit re-deriving adjacency in
  `ai/`. So the slice is: derive every evaluation term from `threshold`/`blastTargets`/
  `isCritical`/`isNearCritical`; add an eslint `no-restricted-syntax` guard scoped to
  `src/game/ai/**` forbidding `.neighbors`/`.diagonals`/`.deep`; pins for rule-derived
  valuation, rule sensitivity, and the guard verified BY INJECTION. Out of scope: the search in
  `choose.ts`, and any numeric tuning of difficulty tiers.
  docs=the writer amends `docs/DECISIONS.md` row 9 (append-only) and `docs/HOW_WE_DO_IT.md`;
  the dispatcher owns `docs/BOARD.md`.
  STEER | 2026-09-27T15:2xZ, while the writer was in flight (steered, not restarted): the guard
  was WIDENED because scoping it to `ai/` was arbitrary — `.neighbors`/`.diagonals` member
  access must ERROR in ALL non-test source (`files: ['src/**/*.ts']` with
  `ignores: ['**/*.test.ts']`), so the rule's geometry keeps exactly one home. `.deep` stays
  banned inside `src/game/ai/**` ONLY: it is a legitimate DISPLAY flag read by the view (11
  sites) and tests legitimately assert geometry (18 assertions today), so a repo-wide `.deep`
  ban would red on correct code. The writer must also report the obligation-4 `COPIES:` line,
  and must not touch `BoardView.ts`/`engine.test.ts` (the dispatcher folded copies there).
  Ledger row for this slice: 9.

LANDED | row=6 | sha=5ec65c3 | verify=DISPATCHER'S OWN: `npm run gate` exit 0 FULL GREEN at
  5ec65c3 — typecheck 0 · lint 0 · 65 tests / 12 files · build 0, raw log
  .gate-logs/gate-20260927T152504Z-3870376.log. Plus the audit that produced it: a
  normalized-body scan (comments stripped, identifiers blanked, 80-char floor) over `src/**`
  reported 105 named function bodies and exactly ONE duplicate group, and after the folds the
  same scan reports 104 bodies and ZERO. `grep -rn "\.neighbors|\.diagonals" src` (non-test)
  returns 4 hits, all inside `src/game/engine/board.ts`.
  | retired=nothing | note=OWNER'S ORDER, verbatim: "Code multiplications are a real vibe
  coding hazard and need to be actively tackled." Three copies folded, direction = DELETE
  only: (a) `mulberry32` duplicated in `engine.test.ts` while `src/lib/rng.ts` is canonical;
  (b) the orb capacity 4 written in three places → `ORB_SLOTS` in `view/layout.ts` is the one
  home; (c) the view hardcoded the RULE's spread — `cell.deep ? 8 : 4` and
  `2 + (cell.deep ? 4 : 0)` → now `Math.max(ORB_SLOTS, threshold(cell))` and `2 +
  cuts.length`, so a future rule change cannot leave a stale number in the view.
  docs=the commit body of 5ec65c3 carries the audit numbers.

QUEUE | row=7 | THE GENERIC DUPLICATION TRIPWIRE — the active half of row=6. A test that
  parses every named function body under `src/**` (INCLUDING `*.test.ts`), normalizes it
  (comments stripped, whitespace collapsed, the function's own and parameter names blanked so
  a rename cannot hide a copy), and requires each 2+-site population to equal a CHECKED-IN
  INVENTORY exactly: a new copy reds naming every site, and a FOLDED copy reds as a stale
  entry until its line is deleted — so a blessing cannot outlive the duplication. Direction is
  therefore DELETE-ONLY: entries are removed when copies are folded, never added to bless a
  duplicate. It is a tripwire, not a proof (it cannot see paraphrases or bodies under its
  measured floor), so each fold still closes with a per-idea "exactly one" pin. Baseline for
  the inventory is ZERO as of 5ec65c3 (104 bodies scanned, 0 groups), which is the cheapest
  moment this can ever be added. Reserved; NOT yet ordered — it is the next slice after
  row=3, and it must be SERIALIZED behind row=3 because both land in
  `docs/HOW_WE_DO_IT.md` and `docs/DECISIONS.md`.

QUEUE | row=4 | DEEP FIELD ships in SKIRMISH only. A campaign mission for it needs a tenth
  mission and the ops grid has the same 3x3 capacity limit. Reserved, NOT ordered.

LANDED | row=5 | sha=47b7742 | verify=DISPATCHER'S OWN: `git push origin HEAD:main` printed
  `62f7c29..47b7742 HEAD -> main`, and `git rev-parse HEAD origin/main` returned the SAME sha
  twice (47b7742d7dd9c2e97332da184f4a349abb4a3d21). The push published row=1 and row=2;
  `main` is NOT a deploy trigger in this repo (deploy is the manual `deploy:sync` FTP script),
  so nothing shipped to the live site. | retired=nothing | note=owner's answer to the fork:
  "Push both landings to origin/main (Recommended)".

TRAP | An atomic mkdir lock acquires ONCE. The gate's first ever run re-attempted `mkdir` right
  after a successful acquisition, failed on its OWN lock, reported a phantom `LOCK RACE`, and
  exited 9 — and because that exit preceded the `trap`, it left an ownerless
  `.blastermaster-lock` behind, which would have refused every run for the full 30-minute
  staleness window. RULE: retry the mkdir ONLY inside the sweep branch, install the trap the
  instant the lock is ours, and treat an ownerless lock as sweepable when no suite is alive.
  The FIRST fix of this failed too: its comment claimed the retry was conditional while the
  code still ran it unconditionally, and the gate refused again (both runs VOID, exit 9). A
  guard is verified by RUNNING it, never by reading the diff.

TRAP | The gate's own lock is not repository dirt. The new dirty-tree warning fired on its
  first run reporting exactly one dirty path: `.blastermaster-lock`, created by the gate after
  it acquired the lock. RULE: transient process artifacts (`.gate-logs/`,
  `.blastermaster-lock`) are gitignored — a warning that is always on is a warning nobody
  reads. The warning still earned its keep: it also caught a tip whose gated content was not
  yet committed.

TRAP | A tenth map card silently overflows the skirmish panel: both title grids are a
  hardcoded 3x3 of 296x128 cards at a 142 pitch, and a fourth row collides with BACK at
  y=672. RULE: a new map card goes through `cardGrid`, and a fourth 128-tall row does NOT
  fit — add a column (4 columns start at x=175), never resize the card.

TRAP | A deep cell's pip set GROWS when a plate falls into one of its diagonal slots, and
  `paintCell` alone cannot add a pip — it only repositions the arcs it already has, so the
  gauge silently understates the reach. RULE: rebuild pips when the edge set changes
  (`BoardView.syncSockets`); never assume a cell's graph is static.

TRAP | Evidence in /tmp is not durable: Campaigner measured /tmp as a per-call tmpfs under a
  restricted sandbox, and a location reliable only while the sandbox is permissive is not a
  location. RULE: gate logs live in `.gate-logs/` (gitignored) and the board names the path.
  Echoing a log with tail/head is display only — the exit code comes from the step, never
  from a pipeline.

GUARD | gate-lock | `scripts/gate.sh` takes an ATOMIC mkdir lock at
  `<repo>/.blastermaster-lock`, derived from the git COMMON dir so the main tree and every
  worktree resolve the same path. Verify: run it twice — the second prints `LOCK HELD` and
  exits 9. A lock older than 30 minutes with no suite process alive is STALE and swept, and an
  OWNERLESS lock with no suite alive is swept after a 5s grace (the orphan a crashed
  acquisition leaves).
GUARD | board-reconciler | `scripts/board.sh` checks every sha, branch, worktree, retired
  branch, lock and the host against reality. Verify: it prints `BOARD RECONCILED`, and prints
  `BOARD STALE` when a LANDED sha is invented or a row is both IN-FLIGHT and LANDED.
GUARD | worktrees-cannot-pollute-the-main-gate | writers work in `worktrees/<slice>`
  (gitignored); `tsc` includes only `src`, vitest's `include` is `src/**` relative to the main
  root, and eslint ignores `worktrees/**` — so a half-finished writer tree cannot enter the
  dispatcher's gate. VERIFIED BY INJECTION 2026-09-27 (row=2): a poisoned probe tree went RED
  at 66 tests while the main tree stayed GREEN at exactly 65.

RECOVERY | A successor starts here: (1) `npm install` (deps are gitignored), (2) `npm run
  board`, (3) read `docs/DECISIONS.md`, (4) `npm run gate` BEFORE any change. The deep-cell
  landing is `ab2b552`; the only outstanding owner fork is QUEUE row=5 (push or not). There
  are no writer worktrees, no writer sessions, and one goal — the chief-of-staff goal, paused.
```

## The gate

`npm run gate` is the ONE way the suite runs. Never hand-roll a test command, and never
quote a result the gate did not print.

| Exit | Meaning |
|---|---|
| `0` | FULL gate GREEN — typecheck + lint + suite + build. The change is **verified**. |
| `1` | RED. The summary names the failing step and echoes its raw output; the log is kept. |
| `2` | COMPILE tier only (`npm run gate:compile`) — build clean, **the suite did not run, NOT verified**. |
| `9` | the lock is held by another actor. This run is **VOID** — not a failure, not evidence. Wait and retry. |

Rules: one suite at a time *in the whole session*; a killed run's result is VOID; a red gate
is information (fix the cause, never re-run until green); never pipe a gate through
`tail`/`head`. A subagent runs its gate **in-turn** — a background job launched by a subagent
dies when that subagent's turn ends.

## The brief (copy this)

A brief is self-contained: the writer never sees the conversation.

```markdown
You are a WRITER on BlasterMaster (Vite + Phaser 3 + TypeScript, npm). Read
`/home/administrator/projects/BlasterMaster/AGENTS.md` FIRST, then `docs/HOW_WE_DO_IT.md`
and `docs/DECISIONS.md`.

# Where you work (READ THIS TWICE)
Your worktree is <ABSOLUTE path: /home/administrator/projects/BlasterMaster/worktrees/<slice>>
on branch <branch>, based on origin/main = <sha>. `npm ci` in that worktree first. Every bash
call runs in a fresh shell whose cwd is the MAIN repo, and file tools resolve relative paths
against it — so EVERY read/edit/write/bash call must use an ABSOLUTE path under your worktree
(or pass a workdir). Never touch the main tree. N other writer(s) may be in flight; your source
files are disjoint, the docs are NOT — a docs conflict is a mechanical UNION (renumber YOUR
row only); a conflict anywhere else: STOP and report.

# Your ledger row: <N>  (assigned here, read from docs/DECISIONS.md at brief time)

# The owner's words (verbatim) and the intent
"<exact quote>" — then the outcome the request is reaching for, and the MEASURED state of the
code today (file:line).

# What to build
One numbered list. Name the ONE seam it extends. State the design decisions already made and
that you may prove wrong. Name what is deliberately OUT of scope and why.

# Pins
The behaviours that must go red when broken, each phrased as a statement. Reuse the existing
harnesses; never build a second fixture set.

# Verification (yours)
1. `npm run gate` — exit 9 means wait and retry, never reap another actor's processes. Keep the
   raw log path. A writer never reports LANDED on a compile-only (exit 2) result.
2. If you claim a guard, verify the guard (break it, watch it go red, restore it).
3. Commit style: one logical change per commit, explicit paths, `git pull --rebase origin main`
   before any push.
4. If you cannot finish: COMMIT the coherent partial state on your branch and report BLOCKED
   with the reasoning. Uncommitted work dies with your session.

# Docs to amend in the SAME commit
`docs/DECISIONS.md` row <N>; `docs/HOW_WE_DO_IT.md` when a pattern changes; `docs/BOARD.md`
only via the dispatcher.

# Your report (short)
LANDED or BLOCKED, then: sha; the gate's summed counts and its exit code; each pin and what
went red; judgement calls; docs amended; and anything this brief got wrong. Report NOTHING in
between — silence until LANDED or BLOCKED. If you can PROVE a rule here is wrong (including
this brief's own design), report BLOCKED with the evidence rather than implementing it.
```

## The parallel-writer recipe

```bash
R=/home/administrator/projects/BlasterMaster
git -C "$R" worktree add "$R/worktrees/<slice>" -b feat/<slice> origin/main
cd "$R/worktrees/<slice>" && npm ci          # ~3s, reuses the shared npm cache
# ...work with ABSOLUTE paths only...
git -C "$R/worktrees/<slice>" add <explicit paths> && git -C "$R/worktrees/<slice>" commit
```

A symlinked `node_modules` is not used here: `npm ci` is cheap enough to be honest. Retire a
slice by removing the worktree **and** the branch (`git worktree remove`, `git branch -d`),
then clear its `IN-FLIGHT` line.
