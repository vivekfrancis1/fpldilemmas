#!/bin/bash
# Repeats the API test suite against the RUNNING dev server (port 5050) and reports which tests
# failed in which run, so an intermittent failure can be caught in the act and diagnosed.
#
#   scripts/flake-hunt.sh [runs] [test files...]
#   scripts/flake-hunt.sh 5                                  # whole suite, 5 times
#   scripts/flake-hunt.sh 10 tests/projection-consistency.test.ts
#   FORCE_REFRESH_AFTER=4 scripts/flake-hunt.sh 3 tests/projection-consistency.test.ts
#       -> also forces a total-points cache refresh 4s into each run (what the background
#          schedulers do on their own), to test for races with them. Uses the seeded LOCAL admin.
#
# Cold-start behaviour matters (that is where the cache-integrity bug showed up): restart the dev
# server before running this to test a cold start. Outputs go under $FLAKE_OUT (default: a mktemp dir).
RUNS=${1:-3}
shift
OUT=${FLAKE_OUT:-$(mktemp -d)}
cd "$(dirname "$0")/.." || exit 1
fails=0
for i in $(seq 1 "$RUNS"); do
  if [ -n "$FORCE_REFRESH_AFTER" ]; then
    COOKIE=$(curl -s -i -X POST http://localhost:5050/api/auth/login -H 'Content-Type: application/json' \
      -d '{"email":"fpldilemmas@gmail.com","password":"fpldilemmas2024"}' | grep -i '^set-cookie' | head -1 | sed 's/^[Ss]et-[Cc]ookie: //; s/;.*//')
    npx vitest run "$@" > "$OUT/run-$i.txt" 2>&1 &
    VPID=$!
    sleep "$FORCE_REFRESH_AFTER"
    curl -s -X POST http://localhost:5050/api/admin/cache/refresh/total-points -H "Cookie: $COOKIE" -o /dev/null
    wait $VPID
  else
    npx vitest run "$@" > "$OUT/run-$i.txt" 2>&1
  fi
  summary=$(grep -E "Tests " "$OUT/run-$i.txt" | tail -1)
  echo "run $i: $summary"
  if grep -qE "^ FAIL " "$OUT/run-$i.txt"; then
    fails=$((fails+1))
    grep -E "^ FAIL |AssertionError" "$OUT/run-$i.txt" | sort -u | sed 's/^/    /'
  fi
done
echo "runs with failures: $fails of $RUNS (full output: $OUT)"
[ "$fails" -eq 0 ]
