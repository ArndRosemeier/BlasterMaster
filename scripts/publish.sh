#!/usr/bin/env bash
# scripts/publish.sh — publish the CURRENT build to the static host (apps.futuremagic.de).
#
# WHY THIS EXISTS (measured 2026-09-27). The published site is a SEPARATE ARTIFACT from this
# repo, so "the code is pushed" has never meant "the site is live" — the owner reported
# "I do not see a 10th map in the published version" against a build from the previous day
# while `origin/main` was already ahead of it. Two mechanical traps made that easy:
#
#   1. STALENESS. Nothing in the push path touches ~/apps/<slug>, so the site silently keeps
#      serving whatever was last copied there.
#   2. THE BLANK-PAGE TRAP. The default `npm run build` is a ROOT-base build (`/assets/…`).
#      Served under `/BlasterMaster/` that resolves to the origin root and renders a BLANK
#      page. The host needs the project's own subpath base, which already exists:
#      `BLASTER_MASTER_BASE` (see vite.config.ts). This script uses it and REFUSES to publish
#      a build whose entry does not carry the subpath.
#
# So: one command, and it verifies by CONTENT rather than by exit code, because a static host
# answers 200 for a stale copy just as happily as for a fresh one.
#
# Exit codes: 0 = published AND verified · 1 = failed, and nothing is guessed about what is live.
#
# Boundary: this script writes ONLY inside ~/apps/<slug>/ (which is a symlink into another
# root — resolved and printed below before anything is written). Publishing a NEW app also
# needs the hub rebuilt (`bash ~/projects/futuremagic/scripts/publish-apps-root.sh`); that
# script belongs to that project, so this one never runs it. The apps root is world-readable:
# build output only, never source, never .env.
set -uo pipefail

SLUG="${PUBLISH_SLUG:-BlasterMaster}" # the EXISTING folder name — renaming publishes a twin
BASE="/$SLUG/"
REPO="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "publish: not inside a git work tree"; exit 1; }
cd "$REPO" || exit 1

echo "publish: $REPO -> $HOME/apps/$SLUG/ (base $BASE)"

# 1. Build with the SUBPATH base — the project's own env var, not a patched config.
BLASTER_MASTER_BASE="$BASE" npm run build
BUILD_CODE=$?
if [ "$BUILD_CODE" -ne 0 ]; then
  echo "publish: build FAILED (exit $BUILD_CODE) — nothing published, the site still serves the last build"
  exit 1
fi

# 2. The blank-page trap, caught before anything is written.
if ! grep -q "$BASE" dist/index.html; then
  echo "publish: dist/index.html does not reference $BASE — that is a root-base build and it renders BLANK under the subpath. Refusing to publish."
  exit 1
fi
ENTRY="$(grep -o 'assets/index-[^"]*\.js' dist/index.html | head -1)"
[ -n "$ENTRY" ] || { echo "publish: no hashed entry asset found in dist/index.html"; exit 1; }

# 3. Resolve the target BEFORE writing: ~/apps/<slug> is usually a symlink into another root,
#    and `--delete` prunes THERE.
TARGET="$(readlink -f "$HOME/apps/$SLUG" 2>/dev/null || true)"
if [ -z "$TARGET" ] || [ ! -d "$TARGET" ]; then
  echo "publish: ~/apps/$SLUG does not resolve to a directory — refusing to write"
  exit 1
fi
echo "publish: resolved target $TARGET"

# 4. Publish. rsync's status is read DIRECTLY, never through a pipe: a partial copy prints
#    per-file errors and can leave the site a MIXTURE of old and new bytes.
rsync -a --delete dist/ "$HOME/apps/$SLUG/"
RSYNC_CODE=$?
if [ "$RSYNC_CODE" -ne 0 ]; then
  echo "publish: rsync FAILED (exit $RSYNC_CODE) — the site may now be a MIXTURE; re-run this script"
  exit 1
fi

# 5. Verify by CONTENT: the served entry must be the asset we just built, byte for byte.
SERVED_ENTRY="$(grep -o 'assets/index-[^"]*\.js' "$TARGET/index.html" | head -1)"
if [ "$SERVED_ENTRY" != "$ENTRY" ]; then
  echo "publish: served entry ($SERVED_ENTRY) != built entry ($ENTRY) — NOT verified"
  exit 1
fi
BUILT_SUM="$(sha256sum "dist/$ENTRY" | cut -d' ' -f1)"
SERVED_SUM="$(sha256sum "$TARGET/$ENTRY" | cut -d' ' -f1)"
if [ "$BUILT_SUM" != "$SERVED_SUM" ]; then
  echo "publish: published bytes differ from the build — NOT verified"
  exit 1
fi

# 6. Optional read of the host's own static server (it serves the same ~/apps root). A static
#    host answers 200 for a stale file too, which is why step 5 is the real check.
if curl -s -o /dev/null --max-time 5 http://127.0.0.1:8082/"$SLUG"/; then
  LOCAL_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:8082/$SLUG/$ENTRY")"
  echo "publish: host static server serves $ENTRY -> HTTP $LOCAL_CODE"
fi

echo "publish: OK  $ENTRY  ->  https://apps.futuremagic.de/$SLUG/"
echo "publish: NOTE the entry page is served DYNAMIC (not edge-cached); assets are content-hashed, so a hard refresh shows this build immediately."
exit 0
