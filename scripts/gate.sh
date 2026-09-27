#!/usr/bin/env bash
# THE gate for BlasterMaster — the ONE way the suite runs. Never hand-roll a test
# command, and never quote a result this script did not print.
#
# Exit codes (the vocabulary — quote them exactly, never inflate):
#   0 = FULL gate GREEN: typecheck + lint + suite + build. The change is VERIFIED.
#   1 = RED: a step failed. The summary names it and its raw output is echoed.
#   2 = COMPILE tier only: build clean, but the SUITE DID NOT RUN — NOT verified.
#   9 = the lock is held by another actor. This run is VOID: not a failure, not
#       evidence. Wait and retry.
#
# Why each part exists:
#   * ONE suite at a time, via an ATOMIC lock (mkdir). `pgrep` is a snapshot, not
#     a lock: two actors can look in the same instant, both see "free", and both
#     start. The refusal must come from the lock itself.
#   * The lock resolves to the SAME path from the main tree and from every
#     worktree — derived from the git COMMON dir, not from $PWD — so a writer and
#     the dispatcher exclude each other.
#   * NOTHING is piped through `tail`/`head`. A pipeline's exit status is its LAST
#     command's, so `gate | tail` reports success whatever the gate did, and the
#     failing test's name and expected/received block are destroyed. The raw log
#     is kept at the path printed on the last line; the echo on failure is a
#     DISPLAY of that log, never the source of the exit code.
#   * TWO TIERS, because they answer two different questions. The FULL run is the
#     default and is what makes a change verified. `GATE_TESTS=0` is the COMPILE
#     tier: `npm run build` (tsc --noEmit && vite build, ~10s) and no suite. It
#     exits 2 and prints its own banner, so a compile-tier result can never be
#     quoted as "the gate passed".
#
# Usage:
#   npm run gate                 # full: typecheck, lint, suite, build
#   npm run gate:compile         # compile tier only (exit 2 on success)
#   GATE_PLAN_ONLY=1 bash scripts/gate.sh   # print the plan, run nothing
set -uo pipefail

cd "$(git rev-parse --show-toplevel)" || { echo "gate.sh: not inside a git work tree"; exit 2; }
REPO="$PWD"

COMMON="$(git rev-parse --git-common-dir)"
case "$COMMON" in /*) ;; *) COMMON="$REPO/$COMMON" ;; esac
LOCK="$(dirname "$COMMON")/.blastermaster-lock"
LOGDIR="$REPO/.gate-logs"

MODE="full"
[ "${GATE_TESTS:-1}" = "0" ] && MODE="compile"

if [ "${GATE_PLAN_ONLY:-0}" = "1" ]; then
  echo "GATE PLAN (nothing is run, no lock is taken)"
  echo "  repo=$REPO"
  echo "  mode=$MODE"
  echo "  lock=$LOCK"
  echo "  log=$LOGDIR/gate-<utc>-<pid>.log"
  if [ "$MODE" = "compile" ]; then
    echo "  steps: build            (tsc --noEmit && vite build; suite NOT run -> exit 2)"
  else
    echo "  steps: typecheck lint test build   (exit 0 GREEN / 1 RED)"
  fi
  echo "  exit codes: 0 full GREEN · 1 RED · 2 compile only (NOT verified) · 9 lock held"
  exit 0
fi

# --- lock ---------------------------------------------------------------------
if ! mkdir "$LOCK" 2>/dev/null; then
  OWNER="$(cat "$LOCK/owner" 2>/dev/null || echo unknown)"
  AGE=$(( $(date +%s) - $(stat -c %Y "$LOCK" 2>/dev/null || date +%s) ))
  if [ "$AGE" -gt 1800 ] && ! pgrep -f "vitest" >/dev/null 2>&1; then
    echo "STALE LOCK: ${AGE}s old, no suite process alive — removing $LOCK" >&2
    rm -rf "$LOCK"
  else
    echo "LOCK HELD by $OWNER (${AGE}s) — this run is VOID, retry after it settles (exit 9)" >&2
    exit 9
  fi
fi
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "LOCK RACE: lost $LOCK after the stale sweep — retry (exit 9)" >&2
  exit 9
fi
echo "gate mode=$MODE pid=$$ started=$(date -u +%Y-%m-%dT%H:%M:%SZ) cwd=$PWD" > "$LOCK/owner"
# shellcheck disable=SC2064
trap "rm -rf '$LOCK'" EXIT

# --- log ----------------------------------------------------------------------
mkdir -p "$LOGDIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG="$LOGDIR/gate-$STAMP-$$.log"
: > "$LOG"

{
  echo "===== BlasterMaster gate ====="
  echo "mode=$MODE  repo=$REPO  head=$(git rev-parse HEAD)"
  echo "started=$(date -u +%Y-%m-%dT%H:%M:%SZ)  load=$(cut -d' ' -f1-3 /proc/loadavg)"
  echo "memAvailable=$(awk '/MemAvailable/{printf "%.1fGB", $2/1048576}' /proc/meminfo)"
  FOREIGN="$(pgrep -af "vitest|vite" 2>/dev/null | grep -v "$$" || true)"
  echo "foreign suite processes (diagnostic; never reaped): ${FOREIGN:-none}"
} | tee -a "$LOG"

run_step() {
  local name="$1"; shift
  echo "----- $name: $* -----" >> "$LOG"
  local start=$SECONDS
  "$@" >> "$LOG" 2>&1
  local code=$?
  printf '%-10s exit=%d  %ss\n' "$name" "$code" "$((SECONDS - start))" | tee -a "$LOG"
  FAILED=""
  [ "$code" -eq 0 ] || FAILED="$name"
  return 0
}

STEPS=()
if [ "$MODE" = "compile" ]; then
  STEPS=(build)
else
  STEPS=(typecheck lint test build)
fi

for step in "${STEPS[@]}"; do
  case "$step" in
    typecheck) run_step typecheck npm run --silent typecheck ;;
    lint)      run_step lint      npm run --silent lint ;;
    test)      run_step test      npm run --silent test ;;
    build)     run_step build     npm run --silent build ;;
  esac
  if [ -n "$FAILED" ]; then
    echo "===== RED: $FAILED failed — raw log $LOG =====" | tee -a "$LOG"
    echo "----- failing step output (display only; the exit code above is the verdict) -----"
    awk -v m="----- $FAILED:" 'index($0, m) == 1 { show = 1 } show' "$LOG"
    exit 1
  fi
done

grep -E "^ +(Test Files|Tests) " "$LOG" | tee -a "$LOG"
echo "log=$LOG"

if [ "$MODE" = "compile" ]; then
  echo "===== COMPILE TIER — build clean; the suite did NOT run, so this is NOT a verified change (exit 2) =====" | tee -a "$LOG"
  exit 2
fi
echo "===== FULL GATE GREEN (exit 0) — verified: typecheck + lint + suite + build =====" | tee -a "$LOG"
exit 0
