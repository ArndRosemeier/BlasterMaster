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
| `SPEC` | a design SETTLED with the owner that a dispatched slice will build (rules in it are requirements, not options) |
| `CLOSED` | a queued item the owner decided NOT to do, kept so the decision stays visible |
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
reconciled: 5cf07f6d499b740e27884d394c71f53db7afe17c · 2026-09-27T20:09Z

SESSION | id=session-1e324382-bce8-42e4-a70d-a3e3fe31c6dc | role=chief-of-staff | state=active
  | note=designated by the owner 2026-09-27 ("please be my chief of staff"); one frozen goal
    (goal-ab88b5ce) created then PAUSED — never re-scoped, resumed or completed. Work is
    driven by WAKE EVENTS ONLY: an owner message, a writer's LANDED/BLOCKED report, or a
    runtime failure notice. A parked tick is not a work order and gets silence.

LANDED | row=13 | sha=871875a | verify=DISPATCHER'S OWN: (1) my own `npm run gate` on the rebased
  tree and again on the merged main tip → exit 0 FULL GREEN, typecheck 0 · lint 0 · **83 tests /
  13 files** · build 0 (logs .gate-logs/gate-20260927T171605Z-3946086.log then …T171657Z-3948991.log);
  (2) MY OWN injections, all reverted, tree clean at 871875a: disabling `isArmoredPlate` reds EIGHT
  tests (survive-first-hit, drop-on-second, one-damage-per-wave, no-blast-through-the-crack,
  cracked-plate map bounds, preview distinction, `=` unchanged, hash contract); making `boardPlates`
  omit cracked plates reds THREE (preview distinction, drop-and-rewire, map bounds) — so the new
  "one home" helper is genuinely pinned, not decorative; (3) the writer's critique of my brief
  REPRODUCES: dropping `|#x:${cracked}` reds exactly ONE test, the contract assertion itself.
  | retired=worktree /home/administrator/projects/BlasterMaster/worktrees/armored-plates · branch
  feat/armored-plates (`-d`, proving merged; `git worktree list` shows only the main tree)
  | note=WHAT LANDED: `+` is a map-authored plate that CRACKS on the first adjacent detonation and
  falls on the second; `=` keeps its exact 1-hit behaviour and no existing map changed. State model
  A: `Board.walls` = INTACT plates only, `Board.cracked` = damaged armoured plates (disjoint),
  `Board.armored` = immutable map fact. `boardPlates()` is the ONE home for "every standing plate"
  (bounds, shafts, view, the collapse scan) and `isArmoredPlate`/`isCrackedPlate` the ONE home for
  the predicates. `collapseWalls` returns `{board, collapsed, cracked}` with `cracked` = NEWLY
  cracked; the scene flinches/scorches a cracked plate and SHATTERS a falling one, and the hover
  preview draws a hollow crack ghost versus a filled fall ghost. BULKHEAD (40 cells, 5 plates of
  which 3 armoured, one deep cell) is the 11th map, and the 11th card's position (third row,
  x 330/640/950, bottom 606 below the BACK panel at 672) is PINNED by a layout test, not assumed.
  THE DISPATCHER'S BRIEF WAS WRONG on one point, recorded rather than smoothed over: I called the
  cracked set entering `hashBoard` "the correctness heart", claiming a cracked position would
  otherwise hash like an intact one and the repeat guard would conflate them. That is FALSE under
  this very model — cracking removes the plate from `walls`, so `#w` already differs, and `cracked`
  is derivable as `armored \ walls \ cells`. The writer proved it with its pin-3 injection and I
  reproduced it with injection (A) above. `#x` was kept as policy/future-proofing with its contract
  pinned honestly; the record now says that instead of claiming a save that was never needed.
  KNOWN CHECKED REDUNDANCY: `Board.cracked` is derivable state, kept for cheap reads and direct
  pins; deriving it would make the `#x` hash term unnecessary.

LANDED | row=14 | sha=ea3018d (2a `4463842` + 2b `ea3018d`, rebased onto `df51c9d`)
  | verify=DISPATCHER'S OWN: (1) my own `npm run gate` on the rebased tree and again on the merged
  main tip → exit 0 FULL GREEN, typecheck 0 · lint 0 · **112 tests / 15 files** · build 0 (logs
  .gate-logs/gate-20260927T174225Z-3990995.log and …T174401Z-3995102.log); (2) MY OWN four
  injections, all reverted, tree clean at ea3018d: `deepDegree` dropping its diagonals reds SEVEN+
  tests across three suites (the plain-cell diagonal pins, the AI's deep-cell valuation, the eater's
  own pins), which PROVES the "one deep-degree source" claim instead of asserting it; keeping the
  eater after its detonation reds the one-shot pin plus the prediction ghost; emptying a neutral
  surplus instead of leaving it neutral reds the surplus pin AND the random-play soak; removing the
  spreader guard reds exactly "never hands the mover a wipe when it is the flood that empties the
  opponent"; (3) MY OWN reachability soak for the gap the writer flagged — 300 random NEST games:
  **frozen=0**, wins=289, draws=11, none stuck at the cap.
  | retired=worktree /home/administrator/projects/BlasterMaster/worktrees/eater · branch feat/eater
  (`-d`, merged; `git worktree list` shows only the main tree) · writer session 90cb307d finished ·
  process audit after the turn: suites=none browsers=none
  | note=WHAT LANDED: `@` is a housing (two detonations, like `+`) that reveals an EATER on the square
  it falls on. An eater is a board-level actor whose SQUARE holds its hoard and is `owner: 'neutral'`
  EVEN AT 0, so it can never be fed. Each activation it moves to the biggest orthogonally adjacent
  pile (clockwise tie-break, first scanned wins; stays if nothing beside it has tokens), absorbs that
  whole stack, and the moment its hoard reaches the DEEP degree of the square it stands on — whether
  or not that square is deep — it detonates exactly ONCE over the DEEP targets as neutral, leaves any
  surplus as neutral tokens, and is gone. Owner rules implemented and pinned: one-shot, deep-degree
  threshold, surplus neutral, activation immediately on reveal then once per round after the REVEALER,
  reveal order for multiples, neutrals inert to placement but re-coloured by any owned blast, and a
  draw when no square is owned by either player. The prediction ghost computes the exact set the phase
  will run (the same simulation as the dumps) and reads `EATER EATS n` / `EATER HOLDS`, with a warning
  ring and `· BOOM` when that bite is fatal to it. The isolation rule had to become the cell's OWN
  out-degree (`threshold === 0`), because populating diagonals everywhere would otherwise have made
  `['#..','.##']` legal — the writer found that and pinned it.
  THE DISPATCHER'S BRIEF WAS WRONG in three places, each found by the writer and verified here:
  (i) "record = position + hoard" would have stored one quantity twice — the hoard IS the square's
  count, so the record is `{at, master}` and the count is the single source that also enters the hash;
  (ii) my wipe instruction ("check wipes only after the mover's cascade") had no reachable form in 2a;
  the load-bearing form is "a wave whose SPREADER is neutral awards no wipe"; (iii) the owner's
  ratified "a blast re-colours a neutral cell" collides with "the eater's square is neutral at 0",
  resolved by exempting the eater's SQUARE (a blast into it feeds the hoard) while neutral PILES still
  clear normally — pinned.
  THE DISPATCHER OVERSTATED A GUARANTEE TO THE OWNER, recorded rather than smoothed over: I told him
  "nothing can lock — the all-neutral case is exactly the tie". That covers nobody owning anything,
  but NOT the residual state where exactly one player owns nothing while every other square is owned
  by the opponent or neutral: that player has no legal move and no rule ends the game. Constructible;
  not observed in 300 games. See QUEUE row=16, which carries the rule fork.
  UNPROVEN, carried as QUEUE items: the eater, neutral and ghost visuals have never been seen on a
  real screen (no browser here — the owner's eyes, and the build is now PUBLISHED so he can look); the
  AI is blind to eaters (QUEUE row=15); and a mixed wave whose neutral and owned piles fire together
  resolves `spreader` to neutral so no wipe is awarded there — a deliberate fail-safe; per-token
  colours stay exact.

LANDED | row=18 | sha=310cdbc | verify=DISPATCHER'S OWN: (1) my own `npm run gate` on the rebased
  tree and on the merged main tip → exit 0 FULL GREEN, typecheck 0 · lint 0 · **121 tests / 16
  files** · build 0 (logs …T182313Z-4019540.log, …T182359Z-4021352.log); (2) MY injection on the
  multi-plate path — revealing only the FIRST fallen plate per cascade — reds exactly the two
  multi-plate pins ("drops FIVE plates in one cascade and runs all five eaters in fall order",
  "reveals two plates in the order they fall"), restored byte-identical from an OUT-OF-TREE copy
  (the TRAP's rule, followed); (3) MY integration probe, which the writer did not run — 40 random
  games on EACH wall map (AIRLOCK 1 plate, BOLTS 2, BULKHEAD 5, NEST 2, SEAM 5): every game
  terminates, a stuck player never arises (the stalemate rule holds in real play), tokens are
  conserved exactly (`+1` per move — eaters move tokens, never create or destroy), and live eaters
  never exceed the map's plate count. Eater observations per 40 games: AIRLOCK 173 · BOLTS 376 ·
  BULKHEAD 2014 · NEST 441 · SEAM 2058 — on five-plate maps an eater is now a CONSTANT presence,
  which is the "plannable, not luck" rule working as intended.
  | retired=worktree /home/administrator/projects/BlasterMaster/worktrees/every-wall · branch
  feat/every-wall (`-d`, merged; only the main tree remains) · writer session 1e80f305 finished ·
  host audit after: suites=none browsers=none, lock free
  | note=WHAT LANDED: every plate that FALLS reveals an eater on the square it fell to, mastered by
  the mover, activating in reveal order; a CRACKED `+` reveals nothing, so crack-then-shatter stays
  a real choice. The `@` glyph, `MapDefinition.housing`, `Board.housing` and the reveal gate are
  DELETED — the housing distinction is gone rather than decorated, so there is no per-map fact left
  to fail to advertise. NEST's two `@` are now `+` (two-hit timing preserved by durability). The
  wall missions' text was corrected in the same landing (AIRLOCK's coach promised "THE PLATE FALLS
  EMPTY"), and the card rule line lives ONCE, in `mapCardText` — which FOLDED a copy out of
  TitleScene. `swiftMoves`, `cascadeWaves`, `mapId` and `difficulty` were deliberately NOT touched.
  THE DISPATCHER'S BRIEF WAS WRONG twice, both proven by the writer BEFORE implementing: (i) my
  "all existing behaviour NOT about housings stays byte-identical" is FALSE — an every-fall reveal
  necessarily changes non-housing pins, because a fallen square is an eater's neutral body and its
  hoard is neutral, so five pins and one soak invariant were RESTATED (never weakened) and the
  counts moved 115/15 → 121/16; (ii) "the five-ish fixtures that carry `housing: []`" — none did;
  the field was optional and only `mapFromRows` filled it.
  DELIBERATELY LEFT: no plate cue on the board itself (its colour has to survive owner/hover/crack/
  near-critical and cannot be checked without a browser), so the signposting is the map card's rule
  line plus the mission text; the card's name/counts moved 8-10 px to fit an 11 px rule line and
  that layout is UNVERIFIED by eye — the owner's look, and it is published.


LANDED | row=19 | sha=a0bdd42 | verify=DISPATCHER'S OWN: my own `npm run gate` on the rebased tree
  and on the merged tip → exit 0 FULL GREEN, typecheck 0 · lint 0 · **130 tests / 18 files** · build 0
  (logs …T192652Z-4041734.log, …T192742Z-4044746.log). MY three injections, each restored
  BYTE-IDENTICAL from an out-of-tree copy (the TRAP's rule, followed, and `cmp -s` checked):
  hardcoding `critical` to 8 reds BOTH "makes the boundary hoards read differently, and a full corner
  unmistakable" and "reads the threshold the engine gives the square, not a fixed degree"; making
  `heat` constant reds the boundary pin; and emitting NO `emerge` cues reds "emerges a revealed eater
  out of the fallen square before its first move" AND the real-engine plan soak. That soak runs in
  the suite: `turns=2458 reveals=119 moves=445 detonations=115` across the five wall maps × 8 seeds.
  | retired=worktree /home/administrator/projects/BlasterMaster/worktrees/eater-juice · branch
  feat/eater-juice (`-d`, merged; only the main tree remains) · writer session 9e66e5c2 finished ·
  host audit after: suites=none browsers=none
  | note=THE PRESENTATION. `src/game/view/eaterView.ts` is PURE (no Phaser) and tested:
  `eaterShell(hoard, threshold)` → `spheres = min(hoard, 8)`, `pulseRate = 0.5 + 2.5·fill`,
  `pulseDepth = 0.04 + 0.14·fill`, `heat = clamp(hoard/threshold, 0, 1)`,
  `critical = hoard >= threshold`; `shellOffsets` lays a clockwise ring from north (≤8); and
  `eaterPlan(waves, eaters, board)` turns engine output into ordered cues
  `wave | emerge | move | hold | detonate`, taking EVERY threshold from the engine's own
  `deepDegree(getCell(board, square))` — never a hardcoded 3 or 8. `BoardView` renders spheres inside
  the body and the old hoard `Text` is gone; the glide is a STRAIGHT AXIS-ALIGNED line that
  `PlayScene` awaits (an arc would imply diagonal travel, which is the one thing the motion must not
  suggest); a reveal is attached to the very wave whose `collapsed` names the square, so the eater
  rises right after the shatter and before any move; and eater bodies are created ONLY by
  `emergeEater`, so an eater can never simply appear (documented cost: an engine path adding an eater
  outside a wave's `collapsed` would be invisible — grep confirms no such path exists).
  BULLET 1 WAS ALREADY TRUE and needed no engine change (the SPEC records the verification):
  `nextMeal` is ortho-only, skips other eaters' squares, and selects nothing unless a neighbour holds
  tokens, so an eater with nothing to eat stays put.
  UNVERIFIED — AND IT IS THE WHOLE POINT OF THIS SLICE (no browser on this host): sphere legibility at
  the shipped cell size, whether the ring crowds at 8, whether the pulse spread actually reads as
  "about to detonate", whether the emergence and the blast-consumption read at all, and whether the
  glide feels like a step rather than a teleport. The pure maths and the engine-output ordering are
  verified; the LOOK is the owner's, and it is PUBLISHED for him.


LANDED | row=20 | sha=5cf07f6 | verify=DISPATCHER'S OWN: (1) my own `npm run gate` on the
  rebased tree and on the merged main tip → exit 0 FULL GREEN, typecheck 0 · lint 0 · **145 tests /
  18 files** · build 0 (logs …T200853Z-4064712.log, …T200952Z-4072524.log); (2) MY three injections,
  each restored BYTE-IDENTICAL from an out-of-tree copy: giving `op-deep` a map that already has a
  mission reds exactly "gives every shipped map at least one campaign mission" (the owner's ask,
  made unfalsifiable); duplicating the core-rules brief onto another mission reds THREE pins
  (exactly-once, the ordered list, and "opens the campaign with the core rule and never repeats
  it"); forcing the ops panel back to 3 columns reds "keeps all twelve OPERATIONS missions on screen
  as a 4x3 grid"; (3) MY content check of all five briefs against the engine's actual rules — every
  claim holds (detonate at neighbour count / pips are the reach / leftover holds; a blast beside a
  plate drops it and EVERY fallen plate frees an eater; deep cells count diagonals, corner 3 interior
  8, and fire into them; armoured plates crack then drop; an eater eats the biggest pile beside it,
  detonates at the deep degree of its square, floods neutral and is gone).
  | retired=worktree /home/administrator/projects/BlasterMaster/worktrees/ops-campaign · branch
  feat/ops-campaign (`-d`, merged; only the main tree remains) · writer session 6da12a2c finished
  (and deleted under subagent hygiene) · host audit after: suites=none browsers=none
  | note=WHAT LANDED: TWELVE missions cover all TWELVE maps — `op-deep` (DEEP FIELD), `op-armor`
  (BULKHEAD), `op-nest` (NEST) appended as 10-12, deep geometry → plate durability → a new actor.
  A mechanic BRIEF is set only on the mission that FIRST introduces it — `op-spark` (mission 1)
  teaches THE CORE RULE exactly as the owner asked, then `op-airlock` PLATES, `op-deep` DEEP CELLS,
  `op-armor` ARMORED PLATES, `op-nest` EATERS — surfaced by `missionIntro` at mission start and by
  `missionCardTag` on the card as `TIER · MECHANIC`. The ops panel's hardcoded 3-column grid was
  folded into `menuGrid`/`menuColumns` reusing the tested `cardGrid`, which ALSO removed the skirmish
  panel's copy of the `>9 ? 4 : 3` rule (COPIES 2→1). PLACEHOLDER thresholds — 28/4, 32/4, 34/4,
  chosen by analogy and EXPLICITLY UNPROVEN; no play-test against the current AI; the existing nine
  missions were not touched (row=8 owns the measurement).
  UNVERIFIED (owner's eyes, and PUBLISHED for them): the four-column OPERATIONS look and card
  density, whether `TIER · MECHANIC` stays legible in a 296px card, whether the banner is readable
  before its ~1.2s fade, and whether the two-line `BRIEF · …` coach line at y=692 clears the board.
  The writer's brief-corrections are recorded as minor and non-blocking: only missions 7-9 have
  all-caps coaches (the first six are sentence case, so the new ones match the later voice); "a brief
  with no map" cannot compile under `Mission.mapId: MapId`, so it was implemented and pinned as the
  runtime twin `campaignProblems`; and the ops `topY` (238) differs from the skirmish one (258), so
  `cardGrid` could not take a single shared options object.


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

LANDED | row=3 | sha=29f78f6 | verify=DISPATCHER'S OWN, not the writer's: (1) rebased the writer's
  824bb4a onto main and ran `npm run gate` at 29f78f6 → exit 0 FULL GREEN, typecheck 0 · lint 0 ·
  67 tests / 12 files · build 0 (raw log .gate-logs/gate-20260927T152832Z-3875635.log on the
  merged main tip); (2) MY OWN differential — reverted `ai/evaluate.ts` to base 47b7742 and ran
  the writer's two pins: BOTH FAIL (`expected 18 not to be 18`; pick `'0,0'` vs `'2,1'`), so the
  pins are genuine discriminators, not tautologies; (3) MY OWN injection at a location the writer
  did not use — `.neighbors` into `src/game/engine/move.ts` → `npx eslint` exit 1 with the
  geometry message; (4) tree restored byte-identical (`git status --porcelain` empty) before the
  merge. Also measured: `ai/` TESTS are held to the stricter bar too (a `.deep` read in
  `ai/*.test.ts` errors), the one deliberate deviation from the repo-wide test exemption.
  | retired=worktree /home/administrator/projects/BlasterMaster/worktrees/ai-rule-derived ·
  branch feat/ai-rule-derived (deleted with `-d`, which only succeeds when it is merged; proved
  gone: `git worktree list` shows only the main tree, `git branch -a` only main) · writer session
  session-f65b232e finished and sent no further work
  | note=OWNER'S ORDER, verbatim: "AI should work on a more fundamental level if it does not do so
  now. The same routines that steer how spread and explosions work should also be used by the AI
  so that changes here will automatically be used by the AI (avoid any code duplications, make
  everything resilient to code changes)".
  WHAT LANDED: `evaluate.ts` now scores per owned cell from `pressure = count / threshold(cell)`
  and `reach = blastTargets(cell).length` (plus territory/tokens/nearCritical), with the base
  weights kept and pressure 40/48 dominating reach 1/2 so a deeper threshold strictly lowers the
  score at every legal count. Two eslint `no-restricted-syntax` blocks make the geometry
  single-site: repo-wide non-test `.neighbors`/`.diagonals` (exempting their one home
  `src/game/engine/board.ts`) and a LAST ai-scoped block that adds `.deep`.
  COPIES: 1 — checked, no duplication (writer's line, and my own grep confirms: the only
  non-test `.neighbors`/`.diagonals` reads are the 4 inside `engine/board.ts`).
  THE BRIEF WAS WRONG, and that is recorded as the dispatcher's error: the pins as I worded them
  were ALREADY TRUE at base (`nearCriticalCount`→`isNearCritical`→`threshold`, and pick
  differences exist at base because `choose.ts` simulates through `applyTurn`), so a literal
  reading of my brief would have produced two tests that guard nothing. The writer proved it,
  reported BLOCKED-style evidence instead of implementing the wording, and rebuilt both pins into
  real discriminators — my differential above confirms the rebuild. `isCritical(cell)` was also
  unusable as a feature term (an ongoing board never has critical cells), so the sanctioned
  vocabulary in the guard messages names it but the features do not use it.
  docs=docs/DECISIONS.md row 9 (append-only, rows 1-8 untouched) + docs/HOW_WE_DO_IT.md (index
  row, the AI-derives-from-primitives pattern, the anti-pattern line) — all in the same commit.

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

LANDED | row=7 | sha=b20f5a6 (writer f8eca0d + the dispatcher's amendment b20f5a6)
  | verify=DISPATCHER'S OWN: my own `npm run gate` on the rebased tree and again on merged main →
  exit 0 FULL GREEN, typecheck 0 · lint 0 · **72 tests / 13 files** · build 0 (logs
  .gate-logs/gate-20260927T153848Z-3889527.log then …153907Z-3890269.log). MY OWN injections, at
  bodies the writer never probed: a verbatim copy of `parseCellId`'s body into a new file → RED
  naming BOTH sites (hash 89b3595e0ee17279, length 285); the same body RENAMED → RED with the
  IDENTICAL hash (identifier blanking proved); a stale inventory entry → RED; deleting the probe →
  GREEN. My own probes of the amended scope: clean tree GREEN; ONE legitimately added `() => 1`
  GREEN; `FLOOR` raised to 10000 → RED; arrows reclassified as methods → RED.
  | retired=worktree /home/administrator/projects/BlasterMaster/worktrees/dup-tripwire · branch
  feat/dup-tripwire (`-d`, proving merged; `git worktree list` shows only the main tree)
  | note=THE GENERIC DUPLICATION TRIPWIRE is now permanent:
  `src/architecture/no-duplicate-implementations.test.ts` parses EVERY function-like body under
  `src/**` (tests included — declarations, expressions, arrows, methods, constructors, accessors),
  tokenizes it (comments dropped, every identifier blanked, literals reduced to value), hashes it,
  and requires every 2+-site population at or above `FLOOR` 80 to equal the checked-in
  `KNOWN_DUPLICATES` inventory EXACTLY. The inventory is EMPTY and its DIRECTION is DELETE-ONLY: a
  new copy reds naming every site, an entry whose copies are folded reds as STALE until deleted.
  **THE BASELINE WAS NOT ZERO — I WAS WRONG.** My row=6 scanner parsed only named `function`
  DECLARATIONS, so it never saw a THIRD live `mulberry32` — an arrow bound to `const rng` at
  `src/game/maps.test.ts:66` — and my "104 bodies, 0 groups" was an artifact of a narrow scanner,
  not a fact about the repo. The writer's broader detector found it (hash 9f47349f7ade60b9,
  `maps.test.ts:66#rng` == `lib/rng.ts#<anonymous>`) and folded it; the inventory is empty only
  after that fold. My earlier claim that the row=6 audit had folded every copy was therefore
  FALSE, and the owner's suspicion ("code multiplications ... need to be actively tackled") was
  better founded than the dispatcher's own measurement. Recorded as a TRAP below.
  DISPATCHER AMENDMENT (b20f5a6): the brief's "checked value, not prose" became an EXACT count in
  the writer's hands, and I measured the cost — adding one legitimate `() => 1` red the tripwire
  and told the reader to update three numbers, i.e. bless-by-ritual inside the file that exists to
  refuse blessing. Replaced with `SCOPE_FLOOR` + `KIND_FLOOR` (per syntax form, floors set from the
  measured histogram: declaration 114, arrow 222, method 52, constructor 4, expression 0,
  accessor 0). My first attempt at that amendment had a bug my own probe caught: `kinds[...]` on a
  plain object literal read `Object.prototype.constructor` and stringified the count, breaking the
  constructor floor; it is a Map now, with the reason in a comment.
  KNOWN LIMITS (stated in the file, recorded here): floor 80 hides a 59-char name-erasure collision
  (`orthoNeighborIds`/`diagNeighborIds` in `board.ts`, a false positive) and a genuine 51-char
  duplication (`TitleScene.ts` BACK-button callbacks at lines 123/184 — queued as row=9).
  COPIES: 2→1 (the writer's line: the `maps.test.ts:66` arrow folded into `src/lib/rng.ts`).
  docs=docs/DECISIONS.md row 10 (append-only; rows 1-8 untouched) + docs/HOW_WE_DO_IT.md, both in
  the same commit, and both amended by me in b20f5a6 to match the new mechanism.

QUEUE | row=8 | RE-CHECK THE CAMPAIGN STAR THRESHOLDS after the row=3 AI judgement change.
  `src/game/ops/campaign.ts` awards stars from `swiftMoves`/`cascadeWaves` per mission (10/2 …
  32/4), and those numbers were tuned against the OLD `evaluate.ts` heuristic. The new one adds
  `pressure` (count/threshold) at weight 40/48 and `reach` at 1/2, so the AI's play has changed
  by construction — but WHICH WAY, and by how much, is UNPROVEN: no play-test has measured the
  new AI's strength, and both the difficulty tiers (`cadet`/`operator`/`director` are lookahead
  and noise settings, untouched) and the star gates may now be mis-calibrated. This is a
  measurement slice, not a tuning slice: play the campaign missions against the new AI, record
  moves-to-win and cascade counts, and compare with the thresholds before changing any number.
  Reserved; NOT ordered. It is the honest cost of letting the owner's rule changes flow into the
  AI automatically — the AI got the new rule for free, and its calibration debt came with it.
  UPDATED 2026-09-27 (row=17/18): the debt GREW — every fallen plate now frees an eater, so
  AIRLOCK, BOLTS and THE SEAM change character and their star gates are even less likely to be
  right, while their numbers were deliberately left alone. Measure before touching them.


LANDED | row=11 | sha=7cde352 | verify=DISPATCHER'S OWN, by CONTENT and not by exit
  code: the published app now serves `assets/index-B9fTQCbK.js`, `last-modified` today, and that
  bundle contains `DEEP FIELD` — checked at the resolved target, through the host's static server
  (HTTP 200), and over `https://apps.futuremagic.de/BlasterMaster/`. `npm run publish` re-run
  afterwards: exit 0, same content hash, verified.
  | note=THE OWNER REPORTED A REAL DEFECT: "I do not see a 10th map in the published version."
  The published artifact was a build from 2026-09-26 19:54 (`assets/index-BdmLiUz6.js`) — older
  than every landing today — and DEEP FIELD is skirmish-only, so the campaign path never showed
  it either. Two mechanical traps caused it, both now closed by `scripts/publish.sh` +
  `npm run publish`: (a) NOTHING in the push path touches `~/apps/<slug>`, so the site silently
  serves the last copy (`git push` is not a publish in this project); (b) the default
  `npm run build` is a ROOT-base build and renders BLANK under `/BlasterMaster/` — the script
  builds with `BLASTER_MASTER_BASE=/BlasterMaster/` and REFUSES a build whose entry does not carry
  the subpath. `docs/HOW_WE_DO_IT.md` claimed the env var's default was `/BlasterMaster/`; it is
  `/`, and that wrong line was corrected in the same commit. Publishing details worth knowing:
  `~/apps/BlasterMaster` is a SYMLINK into `/home/administrator/projects/Migration/apps/BlasterMaster`
  (the script resolves and prints it before writing); the entry page is served `cf-cache-status:
  DYNAMIC` (no edge cache, so a refresh shows a new build at once); `futuremagic.de/BlasterMaster/`
  301s to `apps.futuremagic.de/BlasterMaster/`; the hub already lists this app, so step 7 of the
  publish skill (hub rebuild) was NOT needed and no other app folder was touched.

QUEUE | row=9 | FOLD THE SMALL `TitleScene.ts` DUPLICATION the tripwire can see but its floor
  excludes: the BACK-button callback at line 123 (drawOps) and line 184 (drawSkirmish) are
  identical 51-char normalized bodies (three statements: `playSound('ui')`, `this.view = 'root'`,
  `this.renderPanel()`). Below the 80-char floor on purpose — chasing trivial callbacks is not
  worth a slice — but it IS a real copy, so it is recorded rather than blessed. Extract one private
  method and reuse it. Reserved; NOT ordered; it TOUCHES UI code, so it wants the owner's eyes on
  the panels afterwards like any TitleScene change.

SPEC | row=12 | THE EATER AGENT — OWNER'S DESIGN, rules settled, dispatched as row=14. Verbatim:
  "How about cracking a wall reveals an eater agent. The eaters turn is right after the turn of the
  player who destroyed the wall. It moves to the cell which has the most tokens next to it (not
  diagonally) and consumes the tokens. Once it has enough tokens to explode, it will (like a deep
  cell), spreading neutrally owned cells. Its movement is deterministic. If no cell around has
  tokens, it stays. It scans clockwise (so in a tie, it goes to the cell that it scanned first).
  This introduces the possibility of a tie, if an eater explosion covers the whole board."
  WHY IT IS NOT A WALL TWEAK — the first NON-PLAYER ACTOR, and it breaks four load-bearing
  invariants, each verified in the current engine:
  (a) A THIRD OWNERSHIP STATE. "Neutrally owned cells" means tokens with no player. Today
      `engine.test.ts` asserts `count > 0 ⟺ owner !== null` (lines 534-536, 563) and
      `occupiedCount`/`tokenCount` filter `owner === player` (`board.ts`), while `legalMoves`
      allows placing onto `owner === null` — so neutrals would be harvestable by EITHER player
      (1 tempo claims a whole neutral pile). Model it as an explicit owner value, never as
      `owner: null` with tokens.
  (b) THE WIPE CONDITION. `move.ts:133` awards a wipe when `occupiedCount(opponent) === 0` — so an
      eater that neutralises a player's last cells would HAND THE MOVER A WIN. Must be restated
      before any eater lands.
  (c) ONE OWNER PER WAVE. `applyWave` colours every receiver with the mover (`move.ts:63`), so a
      neutral cell exploding mid-cascade would spray the PLAYER'S colour; the wave needs an explicit
      owner to spread with, not the mover.
  (d) THE CYCLE GUARD. `hashBoard` is cells + wall ids only (`board.ts:264`); the eater's position
      and hoard must enter it or two different boards hash the same and the cascade's repeat guard
      lies. `Outcome` (ongoing/win/draw) can reuse `draw`, but `WinCause` cannot express "the eater
      did it".
  OPEN FORKS FOR THE OWNER: (1) activation — immediately on reveal and thereafter once per round
  after the revealer, or once per round for both players? As stated, the player who cracked the wall
  permanently hosts the eater's slot, which is an odd asymmetry. (2) APPETITE — it eats the LARGEST
  adjacent stack, which is exactly the cell a chain-reaction game is ABOUT, so it may starve the
  core verb; alternatives: eat one token, or ignore cells at/above threshold. (3) EAT = ABSORB vs
  DESTROY — absorbing keeps tokens conserved and gives the eater a readable counter ("6 of 8" → it
  blows next turn); destroying them is invisible and unbounded. (4) multiple eaters and their order.
  (5) the tie condition needs a precise definition ("covers the whole board" = every cell neutral?).
  OWNER'S ANSWERS (2026-09-27): (1) APPETITE — "It should explode identically to deep cell rules.
  So if it has 3 tokens and moved to a corner it explodes. Or at 8 tokens in the middle." CLARIFIED
  by the owner: "I want eaters to explode as if the cell would be a deep cell, not at the cells
  natural threshold, in case that was misunderstood." THE RULE, exactly: the eater's threshold is
  ALWAYS the DEEP degree of the cell it stands on — ortho degree + diagonal degree, IGNORING whether
  that cell is itself deep (corner 3, interior 8) — and its detonation spreads over the DEEP 8-way
  targets. Checked after each activation's move-and-eat, so it can cross the line by overeating in
  one bite (2 in an 8-degree cell that eats a 6-stack is at 8). Neutral cells are NOT deep: a
  neutral pile that itself reaches a threshold spreads by the NORMAL rule.
  THE DISPATCHER HAD THIS WRONG and it was in the record as "`threshold(cell)` AT ITS CURRENT
  POSITION (the deep rule, unchanged)" — but the engine's `threshold()` returns the NATURAL degree
  unless the cell is deep, so a brief written from that line would have produced a corner eater
  detonating at 2 instead of 3. Retracted here rather than quietly edited.
  CODE CONSEQUENCE the eater slice must carry: a PLAIN cell today carries NO diagonal information
  at all — `createBoard` (board.ts:117) and `rewireCells` (board.ts:77) set `diagonals = []` unless
  `deep`, and `engine.test.ts:399` pins `corner.diagonals === []`. So "as if deep" needs a data
  change, not a lookup. RECOMMENDED: populate `diagonals` for EVERY cell and gate its USE on `deep`
  (`threshold`/`blastTargets` consult the flag; the eater's deep degree is then just
  neighbors+diagonals), so the eater's threshold and a deep cell's own threshold come from ONE
  source and the anti-duplication guard stays satisfied; the restated pin becomes "a plain cell HAS
  diagonal neighbours but does not use them". The alternative — a board-level deep-degree helper
  that recomputes diagonal adjacency — duplicates the concept and would be a copy the tripwire
  cannot see.
  TACTICAL CONSEQUENCE worth keeping: because the eater walks to the biggest adjacent stack, a
  player can LURE it onto a low-degree cell (a corner: 3) to make it detonate early, in a chosen
  spot, rather than waiting for 8 in the middle. That is the counterplay this mechanic needs.
  owner's correction verbatim: "Oh an eater should be gone after it explodes, i thought that was
  clear but i did not state it yet." The eater is REMOVED by its own detonation — one detonation
  per eater, ever. THE DISPATCHER INFERRED OTHERWISE (survival with the leftover, "it can survive
  its own blast by overeating"); that inference is wrong and was stated to the owner before it was
  corrected, and is recorded here so the wrong version cannot be briefed from.
  CONSEQUENCE, SETTLED BY THE OWNER — verbatim: "Yea, thats exactly right, overshooting leaves
  neutrals." A hoard above the threshold leaves the surplus in that cell as NEUTRAL tokens: the
  detonation still subtracts `threshold` and sends one token per target, so conservation holds
  unchanged, and the eater's death leaves a harvestable pile exactly where it died. Destroying the
  surplus was the rejected alternative — bounded at one detonation per eater, so the cascade would
  still terminate, but it would break the "total tokens == placements" invariant permanently.
  (3) ACTIVATION — immediately on reveal, then once per round after the REVEALER, which means the
  game state must record who revealed it.
  (3) COMBINE with two-hit plates: a housing that takes two detonations to crack, so releasing an
  eater costs real tempo. That prerequisite is its own slice (row=13, IN FLIGHT above); the eater
  is briefed off its landing.
  STAGING: slice 1 = row=13 two-hit plates — LANDED as 871875a. slice 2 = the eater — NEXT.
  absorb + grow + neutral spread + the wipe-rule fix + hash/outcome/pins + one map. slice 3 = the
  whole-board tie, multiple eaters and the "it eats HERE next" prediction ghost.
  RULES SETTLED BY THE OWNER 2026-09-27 (owner's earlier words: "This introduces the possibility
  of a tie, if an eater explosion covers the whole board."):
  (i) THE TIE — after the eater's detonation and its neutral cascade SETTLE, if NO cell is owned by
  either player, the game is a DRAW. Reuses `Outcome.draw`; it must be checked after the eater
  phase, and it is also the safety valve that stops an all-neutral board from locking up.
  (ii) NEUTRAL PILES ARE **INERT** TO PLACEMENT — a neutralised cell is not a legal placement
  target until it is empty. This REVERSES the dispatcher's harvest recommendation, and it costs
  ZERO code: `legalMoves` already tests `owner === null || owner === player`, so a neutral owner is
  excluded by construction.
  (ii-b) BUT NEUTRALS DO NOT PERSIST — owner, verbatim: "No, neutral cells will not stay neutral.
  As soon as owned spells EXPLODE on them, they go away." Any explosion that reaches a neutral cell
  RE-COLOURS it to the spreading owner with +1 token, which is the engine's existing rule
  (`applyWave` sets `owner: player` on every receiver) — so a neutral pile is cleared by BLASTING
  it, and a neutral cascade spreads neutral. THE DISPATCHER GOT THIS WRONG: it recorded and
  reported "a neutral pile below its threshold never clears by itself, so a partial flood
  PERMANENTLY shrinks the playable board (dead zones)". That contradicts the owner's rule and is
  retracted here rather than quietly deleted.
  CORRECTED CONSEQUENCES: the flood is TEMPORARY DENIAL, not scar tissue — either player can
  reclaim a neutral pile by cascading into it. Blasting a fat neutral pile means INHERITING it at
  +1, which can arrive critical and detonate in the blaster's own colour: a real gamble, and the
  counterplay the inert-placement rule would otherwise remove. The all-neutral case is still caught
  by the tie rule, which is checked right after the eater phase, so nothing locks. The eater's own
  cell is neutral, so it cannot be fed directly — you influence it by building beside it (the bait).
  (iii) MULTIPLE EATERS activate in REVEAL ORDER, so the reveal order is state and must enter
  `hashBoard` (the dispatcher's alternative, clockwise-from-north order derived from the board,
  was rejected in favour of the player-intuitive one).

SPEC | row=17 | EVERY WALL HIDES AN EATER — OWNER'S RULING, and it SUPERSEDES the `@` housing opt-in.
  Verbatim: "Just make it so that Every wall hides an eater. Deterministic and plannable, keeps this
  from becoming a game of luck." So the housing DISTINCTION dies: every plate that FALLS reveals an
  eater on the square it fell to (a cracked `+` has not fallen and reveals nothing), mastered by the
  player whose turn it is, activating in reveal order — and with it go the `housing` map fact, the
  `@` glyph and the reveal gate. That also kills the discoverability defect at its root: there is
  nothing left to distinguish, so nothing left to fail to see.
  CONSEQUENCES THIS LANDING MUST HANDLE: (1) the campaign wall missions' text says plates fall EMPTY
  — AIRLOCK's coach verbatim is "BLOW THE FRAME. THE PLATE FALLS EMPTY." plus BOLTS and THE SEAM —
  and that becomes FALSE, so their dossier/coach must describe the eater; (2) BULKHEAD and THE SEAM
  each carry FIVE plates and can therefore release five eaters in one phase (NEST keeps two, as `+`:
  its two-hit timing comes from durability, not from a housing glyph); (3) the star gates
  (`swiftMoves`/`cascadeWaves`) for the wall missions were tuned with NO eaters and are now
  UNPROVEN — that is row=8's measurement, never a number to guess at now; (4) signposting is now a
  RULE rather than a map fact, so a player must be able to learn, before breaking a plate, that
  breaking it releases an eater (map card, mission text, and a cue on the plate itself).
  This SUPERSEDES the discoverability queue line it replaces (housing-vs-armoured visuals): with
  every wall alike, there is no per-map fact to advertise — only the rule.
  LANDED as row=18 · sha=310cdbc.

CLOSED | row=15 | TEACH THE AI ABOUT EATERS — the owner decided AGAINST it, verbatim: "I think its
  too complicated to do this right, so... let the AI ignore it and stay stable." The AI stays
  blind to eaters on purpose (it neither baits nor dodges one, and cannot read a `@` housing as a
  bomb with a fuse). Kept here so a successor does not re-raise it as debt: it is a CHOICE. Ledger
  row 14. If the calibration measurement (row=8) ever shows the naivety costing games, reopen it
  with that evidence.

LANDED | row=16 | sha=b102c38 | verify=DISPATCHER'S OWN, by injection both ways (my own work, not
  a writer's): removing the stalemate branch reds exactly "awards the game to the opponent, by
  wipe, the moment the state exists", and DROPPING THE `hasPlaced` GUARD reds exactly "does NOT
  award it before the stuck player has ever placed (the opening-bounce guard)". My own gate:
  exit 0 FULL GREEN, 115 tests / 15 files, log .gate-logs/gate-20260927T175635Z-4001850.log.
  | retired=nothing (no writer: a ten-line rule in one seam, done by the dispatcher) | note=THE
  OWNER'S RULING "That player loses" is implemented in `applyTurn`: after a move resolves, if the
  player who is next to move has NO legal move at all, the mover wins by `wipe`. `legalMoves` is
  the engine's own predicate — no second definition of "can move" — and the `hasPlaced` guard
  mirrors the wipe rule's opening-bounce protection. Reachability of the state was never observed
  (0 in 300 random NEST games) but it was constructible, and it is now decided rather than hung.
  A DISPATCHER SLIP during this verification, recorded: reverting an injection with
  `git checkout HEAD -- src/game/engine/game.ts` DELETED the uncommitted implementation, because
  HEAD did not hold it yet — the very rule the ported brief template states ("restore from HEAD in
  a trap, or from an out-of-tree copy while the slice is still uncommitted"). It cost one red gate
  run and a re-apply; the fix is now a TRAP below.


CLOSED | row=4 | A DEEP FIELD CAMPAIGN MISSION — SUPERSEDED BY row=20. The owner's "all these maps
  in operations" produced it together with the other two new maps, so this fork is resolved: DEEP
  FIELD is mission 10 of twelve. Kept so a successor does not re-open it as outstanding work.

LANDED | row=5 | sha=47b7742 | verify=DISPATCHER'S OWN: `git push origin HEAD:main` printed
  `62f7c29..47b7742 HEAD -> main`, and `git rev-parse HEAD origin/main` returned the SAME sha
  twice (47b7742d7dd9c2e97332da184f4a349abb4a3d21). The push published row=1 and row=2;
  `main` is NOT a deploy trigger in this repo (deploy is the manual `deploy:sync` FTP script),
  so nothing shipped to the live site. | retired=nothing | note=owner's answer to the fork:
  "Push both landings to origin/main (Recommended)".

TRAP | "THE CODE IS PUSHED" IS NOT "THE SITE IS LIVE". The published app is a SEPARATE ARTIFACT
  under `~/apps/<slug>` (a symlink into another root), and nothing in the push path updates it, so
  it keeps serving whatever was last copied there. Measured 2026-09-27: the owner saw a 9-map build
  from the previous day while `origin/main` already had the tenth map. RULE: publish with
  `npm run publish` and judge it by CONTENT — a static host answers `200` for a stale copy exactly
  as happily as for a fresh one.

TRAP | The subpath build is NOT the default build. `vite.config.ts` defaults `BLASTER_MASTER_BASE`
  to `/`, so a plain `npm run build` produces a root-base bundle whose `/assets/...` URLs resolve
  against the origin root and render a BLANK page under `https://apps.futuremagic.de/BlasterMaster/`.
  `docs/HOW_WE_DO_IT.md` had this backwards until 2026-09-27. RULE: only `npm run publish` builds
  for the host, and it refuses a build whose entry does not carry the subpath.

TRAP | A BLIND GUARD PRINTS THE SAME "none" AS A CLEAN BOX. The process audit's first version
  indexed the wrong argv field, so it could never match: it reported `suites=none` WHILE a fake
  suite was running, which reads exactly like an idle host. RULE: a guard that watches for
  something must be proven by INJECTING that thing and watching the guard see it, then reaping it —
  "it printed none" is not evidence that nothing is there, only that it printed none. Measured
  2026-09-27, caught by the injection and by nothing else.

TRAP | `git checkout HEAD -- <file>` DESTROYS UNCOMMITTED WORK IN THAT FILE. Measured 2026-09-27: a
  dispatcher reverting an injection that way deleted the stalemate implementation it had just
  written, because HEAD did not hold it yet; the next gate ran RED against a half-restored tree and
  the rule had to be re-applied. RULE: while a slice is uncommitted, restore an injection from an
  OUT-OF-TREE COPY, or commit the implementation first and inject against the commit — HEAD is only
  a valid restore point once it holds the work.

TRAP | A CASCADE TERMINATES ONLY BECAUSE THE HASH REFLECTS THE STATE. An injection that lets state
  GROW without bound changes `hashBoard` every wave, so the repeat guard in `applyMove` never fires
  and the cascade never terminates. Measured 2026-09-27 during the armoured-plate pins: an injection
  that made a cracked plate re-crack forever grew `cracked` unboundedly and OOM'd a vitest worker —
  and a synchronous runaway loop cannot be interrupted by vitest's per-test timeout, so it must be
  stopped by memory or by hand. RULE: a "growth" injection measures TERMINATION, not just its pin;
  run it watching memory, never while a gate is running, and keep every new piece of board state in
  the hash for exactly this reason.

TRAP | A DUPLICATE SCAN'S SCOPE IS THE THING MOST LIKELY TO BE WRONG — measure the scanner
  against the HAZARD, never against itself. The row=6 audit parsed only named function
  DECLARATIONS, so it reported "104 bodies, 0 groups" on a tree that still held a live third
  `mulberry32` — an arrow bound to `const rng` in `src/game/maps.test.ts:66`. A scanner that finds
  only what it looks for always agrees with itself, so "0 duplicates" was self-confirming, and the
  dispatcher reported it to the owner as a measurement. RULE: a duplication count is evidence only
  once the detector's scope covers every FORM the hazard can take (arrow, expression, method,
  accessor, anonymous), which is what `src/architecture/no-duplicate-implementations.test.ts` now
  does — and its own coverage is checked by `KIND_FLOOR`, so it cannot silently narrow again.

TRAP | The eslint geometry guard is SYNTACTIC, not semantic. It errors on `.neighbors`/`.diagonals`
  member reads in non-test source, so it catches a re-derived threshold only when the copy READS
  the arrays. A hardcoded rule NUMBER reads nothing and passes CLEAN — measured 2026-09-27 by
  injection: `const probeC = (deep: boolean) => (deep ? 8 : 4);` in `src/game/view/layout.ts` →
  `npx eslint` exit 0. That is exactly the class the row=6 audit found in `BoardView` and folded
  to `threshold(cell)`. RULE: the guard is one layer, never the answer — a rule NUMBER in a view
  is a bug to fold, and the per-idea pin is what closes it.

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

GUARD | geometry-has-one-home | `eslint.config.js` errors on `.neighbors`/`.diagonals` member reads
  in ALL non-test source except their one home `src/game/engine/board.ts`, and additionally on
  `.deep` inside `src/game/ai/**` (that block is LAST, so it wins for ai files — including
  `ai/*.test.ts`, a deliberate deviation: ai tests are held to the stricter bar too). Verify by
  injection: `.neighbors` into any other src file → lint exit 1; `.deep` in a non-ai view file →
  clean (it is a display flag the view may read); `.deep` in `ai/*.test.ts` → error. Known limit:
  hardcoded rule NUMBERS are not caught (see the TRAP on the syntactic guard).
GUARD | process-audit-that-can-see | after every landing (and after any turn that died) the reconciler
  lists live suite workers and browsers: a turn that ends does not kill its processes and the box is
  shared. Detection anchors on the FIRST ARGV TOKEN (`ps -eo pid=,etimes=,args=`, so the token is
  `$3`), never on `comm` — on this host a node process reports `comm=MainThread`, so a comm-based
  scan finds ZERO node processes while the DSH web server and OpenClaw run (measured 2026-09-27).
  Browsers are counted by `comm`, which cannot self-match the auditing shell. THE FIRST VERSION OF
  THIS GUARD WAS BLIND: it indexed `$4`, so it matched nothing and printed `suites=none` — output
  identical to a clean box — and it was caught only by injecting a fake suite, never by reading it.
  VERIFIED AFTER THE FIX, by injection: with a fake `node … vitest-fake-probe` alive the audit
  printed `suites=<pid>(1s)`, the gate's diagnostic listed the same pid and NOT the auditing shell,
  and after reaping it by explicit PID the audit returned to `suites=none browsers=none`.
GUARD | heavy-check-overlap | the gate lock is honoured — it resolves to the same path from the
  main tree and every worktree (measured: `--git-common-dir` is `.git` in the main tree and the
  absolute path in a worktree, so both yield `<repo>/.blastermaster-lock`) — but a DIRECT test run
  does not take the lock, by design, because the doctrine exempts cheap checks. Measured
  2026-09-27: a writer verifying its pins with `vitest run src/game/engine/engine.test.ts` held
  3.4GB in ONE worker (4.2GB across 14 processes) WHILE the dispatcher's gate ran, and memAvailable
  fell from 15.7GB to 12.7GB. RULE: the exemption is for CHEAP checks; a heavy or long direct run is
  an overlap someone must choose knowingly, and the gate's foreign-suite diagnostic is what shows
  it. Never reap another actor's live suite — the processes were left alone.
GUARD | gate-diagnostic-honesty | the foreign-suite line matches only `node.*(vitest|vite)`, because
  the looser `vitest|vite` pattern matched the gate's OWN caller — a `bash -c` whose commit message
  mentioned `vite.config.ts` — and reported it as a foreign suite (measured 2026-09-27). It is a
  diagnostic and never reaped anything, but a diagnostic that cries wolf trains people to skip it.
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

RECOVERY | A successor starts here: (1) `npm install`, (2) `npm run board` (reconciles this file
  and audits live suite/browser processes and the lock), (3) read `docs/DECISIONS.md`, (4) `npm run
  gate` BEFORE any change, (5) `npm run publish` to make a build LIVE — `git push` does not publish.
  Landings, oldest first: `ab2b552` deep cells · `b475fd1` the process · `5ec65c3` duplication folds ·
  `29f78f6` AI rule-derivation · `b20f5a6` the tripwire · `871875a` armored plates · `ea3018d` the
  eater · `b102c38` the stalemate rule + AI-stays-blind · `310cdbc` every fallen plate reveals an
  eater · `a0bdd42` eater presentation · `5cf07f6` all twelve maps in OPERATIONS + one-shot mechanic
  briefs. NO OUTSTANDING OWNER FORKS (row=4 was closed by row=20). Queued work: row=8 (the AI's
  calibration debt, GROWN by row=18 and by the three placeholder thresholds in row=20), row=9 (a
  small TitleScene fold). CLOSED by owner decision: row=15 (the AI stays blind to eaters). Open
  verification the OWNER owes himself: every visual claim — no browser exists here, so the LOOK is
  pure maths plus his eyes. No writer worktrees, no writer sessions, one goal — the chief-of-staff
  goal, paused.
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
