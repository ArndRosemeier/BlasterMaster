#!/usr/bin/env bash
# scripts/board.sh — reconcile docs/BOARD.md against reality.
#
# Read-only, takes no lock, safe to run at any time. The board is prose about
# state, and prose about state rots, so every claim it makes is CHECKED here
# instead of being believed. A stale board is a FINDING to report and fix, not a
# crash: the exit status stays 0 and the last line says which it is.
#
# A check that cannot look says so, rather than passing silently.
#
# Usage: npm run board            (or bash scripts/board.sh)
# Env:   BOARD=<path> (default docs/BOARD.md)
set -uo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "board.sh: not inside a git work tree"; exit 2; }
REPO="$PWD"
BOARD="${BOARD:-docs/BOARD.md}"
[ -f "$BOARD" ] || { echo "board.sh: BOARD MISSING — $BOARD"; exit 2; }

STALE=0
say() { printf '%s\n' "$*"; }
stale() { say "STALE: $*"; STALE=1; }

say "=== board reconcile · $BOARD · $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
say "repo=$REPO"
say "head=$(git rev-parse --short HEAD)  origin/main=$(git rev-parse --short origin/main 2>/dev/null || echo '(unresolved)')"

# --- reconciled: the commit the rest of the board was checked against ---------
REC="$(grep -m1 '^reconciled:' "$BOARD" 2>/dev/null | sed -E 's/^reconciled: *([0-9a-f]{7,40}).*/\1/')"
if [ -z "$REC" ]; then
  stale "no reconciled: record — a successor cannot tell what the board was checked against"
else
  if git merge-base --is-ancestor "$REC" HEAD 2>/dev/null; then
    say "reconciled=$REC is an ancestor of HEAD ok"
  else
    stale "reconciled=$REC is NOT an ancestor of HEAD"
  fi
  if git merge-base --is-ancestor "$REC" origin/main 2>/dev/null; then
    say "reconciled=$REC is on origin/main ok"
  else
    say "NOTE reconciled=$REC is not on origin/main (unpushed landing — expected while local-only)"
  fi
fi

# --- LANDED: the sha must exist and say where it lives ------------------------
LANDED_SHAS="$(grep -E '^LANDED \|' "$BOARD" 2>/dev/null | grep -oE 'sha=[0-9a-f]{7,40}' | sed 's/^sha=//' || true)"
if [ -z "$LANDED_SHAS" ]; then
  say "LANDED rows: none recorded yet"
else
  while read -r sha; do
    [ -n "$sha" ] || continue
    if ! git cat-file -e "${sha}^{commit}" 2>/dev/null; then
      stale "LANDED sha=$sha does not exist in this repo"
      continue
    fi
    if git merge-base --is-ancestor "$sha" origin/main 2>/dev/null; then
      say "LANDED sha=$sha is on origin/main ok"
    elif git merge-base --is-ancestor "$sha" HEAD 2>/dev/null; then
      say "LANDED sha=$sha is on local HEAD only (NOT pushed)"
    else
      stale "LANDED sha=$sha is reachable from neither HEAD nor origin/main"
    fi
  done <<< "$LANDED_SHAS"
fi

# --- a row cannot be both in flight and landed --------------------------------
INFLIGHT_ROWS="$(grep -E '^IN-FLIGHT \|' "$BOARD" 2>/dev/null | grep -oE 'row=[0-9]+' | sort -u || true)"
LANDED_ROWS="$(grep -E '^LANDED \|' "$BOARD" 2>/dev/null | grep -oE 'row=[0-9]+' | sort -u || true)"
if [ -n "$INFLIGHT_ROWS" ] && [ -n "$LANDED_ROWS" ]; then
  BOTH="$(comm -12 <(printf '%s\n' "$INFLIGHT_ROWS") <(printf '%s\n' "$LANDED_ROWS") || true)"
  while read -r row; do
    [ -n "$row" ] || continue
    stale "$row carries both an IN-FLIGHT and a LANDED record (IN-FLIGHT is current state only)"
  done <<< "$BOTH"
fi

# --- IN-FLIGHT: branch and worktree must really exist ------------------------
if [ -n "$INFLIGHT_ROWS" ]; then
  while read -r line; do
    [ -n "$line" ] || continue
    branch="$(printf '%s\n' "$line" | sed -E 's/.*branch=([^ |]+).*/\1/')"
    worktree="$(printf '%s\n' "$line" | sed -E 's/.*worktree=([^ |]+).*/\1/')"
    if [ -n "$branch" ] && [ "$branch" != "$line" ]; then
      git show-ref --verify --quiet "refs/heads/$branch" \
        || stale "IN-FLIGHT claims branch=$branch, which does not exist"
    fi
    if [ -n "$worktree" ] && [ "$worktree" != "$line" ]; then
      git worktree list --porcelain | grep -qx "worktree $worktree" \
        || stale "IN-FLIGHT claims worktree=$worktree, which is not a live worktree"
    fi
  done <<< "$(grep -E '^IN-FLIGHT \|' "$BOARD")"
fi

# --- every live worktree except the main one must be named on the board -------
while read -r wt; do
  [ -n "$wt" ] || continue
  [ "$wt" = "$REPO" ] && continue
  grep -q "worktree=$wt" "$BOARD" || stale "worktree $wt exists but the board does not name it"
done <<< "$(git worktree list --porcelain | awk '/^worktree /{print $2}')"

# --- retired branches named as retired must be gone --------------------------
RETIRED="$(grep -E '^LANDED \|' "$BOARD" 2>/dev/null | grep -oE 'retired=[^|]*' | grep -oE 'branch=[^ ,]+' | sed 's/^branch=//' || true)"
while read -r br; do
  [ -n "$br" ] || continue
  if git show-ref --verify --quiet "refs/heads/$br"; then
    stale "retired branch $br still exists"
  fi
done <<< "$RETIRED"

# --- the suite lock -----------------------------------------------------------
COMMON="$(git rev-parse --git-common-dir)"
case "$COMMON" in /*) ;; *) COMMON="$REPO/$COMMON" ;; esac
LOCK="$(dirname "$COMMON")/.blastermaster-lock"
if [ -d "$LOCK" ]; then
  OWNER="$(cat "$LOCK/owner" 2>/dev/null || echo unknown)"
  AGE=$(( $(date +%s) - $(stat -c %Y "$LOCK" 2>/dev/null || date +%s) ))
  if [ "$AGE" -gt 1800 ] && ! pgrep -f "vitest" >/dev/null 2>&1; then
    stale "suite lock is STALE (${AGE}s, no suite alive) at $LOCK — remove it before gating"
  else
    say "suite lock HELD (${AGE}s) by $OWNER"
  fi
else
  say "suite lock free ($LOCK)"
fi

# --- host gauge, and the checks that cannot look ------------------------------
say "host: load=$(cut -d' ' -f1-3 /proc/loadavg) memAvailable=$(awk '/MemAvailable/{printf "%.1fGB", $2/1048576}' /proc/meminfo) cpus=$(nproc)"
say "suite processes: $(pgrep -af 'vitest|vite build' 2>/dev/null | grep -v 'board.sh' || echo none)"
say "session liveness: NOT CHECKED (no DSH session registry path is resolved for this repo)"

if [ "$STALE" -eq 0 ]; then
  say "BOARD RECONCILED"
else
  say "BOARD STALE — fix $BOARD before dispatching"
fi
exit 0
