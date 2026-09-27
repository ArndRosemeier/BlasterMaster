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
# The acquisition is ONE mkdir. A second mkdir right after a successful first one
# fails on OUR OWN lock and reports a phantom race (measured 2026-09-27: the gate's
# first ever run exited 9 that way and left an ownerless lock dir, because the early
# exit preceded the trap) — so a retry happens ONLY after a sweep, and the trap is
# installed the instant the lock is ours.
lock_owner() { cat "$LOCK/owner" 2>/dev/null || echo "(no owner file)"; }
lock_age() { echo $(( $(date +%s) - $(stat -c %Y "$LOCK" 2>/dev/null || date +%s) )); }
suite_alive() { pgrep -f "vitest" >/dev/null 2>&1; }
lock_sweepable() {
  if [ ! -f "$LOCK/owner" ]; then
    # A lock being written this instant, or an orphan from a crashed acquisition.
    [ "$(lock_age)" -le 5 ] && return 1
    suite_alive && return 1
    return 0
  fi
  [ "$(lock_age)" -gt 1800 ] && ! suite_alive
}

if mkdir "$LOCK" 2>/dev/null; then
  : # ours
else
  OWNER="$(lock_owner)"
  AGE="$(lock_age)"
  if lock_sweepable; then
    echo "SWEEPING STALE LOCK at $LOCK (age=${AGE}s, owner=$OWNER, no suite alive)" >&2
    rm -rf "$LOCK"
    # The ONLY retry, and it is INSIDE the sweep branch. A retry placed at the end
    # of the block runs after a SUCCESSFUL first mkdir, fails on our own lock, and
    # reports a phantom race — that mistake shipped twice on 2026-09-27 and both
    # runs were VOID (exit 9); the second one because the fix's own comment claimed
    # the retry was conditional while the code was not.
    if ! mkdir "$LOCK" 2>/dev/null; then
      echo "LOCK RACE: another actor took $LOCK during the sweep — retry (exit 9)" >&2
      exit 9
    fi
  else
    echo "LOCK HELD by $OWNER (${AGE}s) — this run is VOID, retry after it settles (exit 9)" >&2
    exit 9
  fi
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
  # A verdict names a TREE. If the tree is dirty it does not name a commit, and a
  # LANDED record must wait for the commit that makes the gated content real
  # (measured 2026-09-27: a green run printed head=<sha> while the tree carried an
  # uncommitted fix).
  DIRTY="$(git status --porcelain | wc -l)"
  if [ "$DIRTY" -gt 0 ]; then
    echo "WORKING TREE DIRTY ($DIRTY path(s)) — this verdict names the TREE, not commit $(git rev-parse --short HEAD)"
  fi
  echo "started=$(date -u +%Y-%m-%dT%H:%M:%SZ)  load=$(cut -d' ' -f1-3 /proc/loadavg)"
  echo "memAvailable=$(awk '/MemAvailable/{printf "%.1fGB", $2/1048576}' /proc/meminfo)"
  # `node.*(vitest|vite)` and not a bare `vitest|vite`: the loose pattern matched this gate's
  # OWN caller — a `bash -c` whose commit message mentioned vite.config.ts — and printed it as a
  # foreign suite (measured 2026-09-27). Only the node processes are real suites.
  FOREIGN="$(ps -eo pid=,etimes=,args= | awk '$3 ~ /(^|\/)node$/ && /vitest|vite/ {printf "%s(%ss) ", $1, $2}')"
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
