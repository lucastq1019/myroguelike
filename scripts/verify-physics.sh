#!/bin/bash
set -e
cd "$(dirname "$0")/.."
echo '=== tsc ==='
npx tsc --noEmit -p tsconfig.json 2>&1 | head -20
echo '=== physics self-test ==='
npx tsx src/GameEngine/physics/verify-physics.ts 2>&1 | tail -3
echo '=== abilities test (pass count) ==='
npx tsx src/game/verify-abilities.ts 2>&1 | grep -cE '✅'
echo '=== bigmask regression (pass count) ==='
npx tsx src/game/verify-bigmask.ts 2>&1 | grep -cE '✅'
echo '=== perf/arch regression (pass count) ==='
npx tsx src/game/verify-perf.ts 2>&1 | grep -cE '✅'
echo '=== game verify (pass count) ==='
npx tsx src/game/verify-game.ts 2>&1 | grep -cE '✅'
echo '=== enemies regression (pass count) ==='
npx tsx src/game/verify-enemies.ts 2>&1 | grep -cE '✅'
echo '=== weapons regression (pass count) ==='
npx tsx src/game/verify-weapons.ts 2>&1 | grep -cE '✅'
echo '=== upgrades regression (pass count) ==='
npx tsx src/game/verify-upgrades.ts 2>&1 | grep -cE '✅'
echo '=== pickups regression (pass count) ==='
npx tsx src/game/verify-pickups.ts 2>&1 | grep -cE '✅'
echo '=== reroll regression (pass count) ==='
npx tsx src/game/verify-reroll.ts 2>&1 | grep -cE '✅'
echo '=== unlocks regression (pass count) ==='
npx tsx src/game/verify-unlocks.ts 2>&1 | grep -cE '✅'
echo '=== transform regression (pass count) ==='
npx tsx src/game/verify-transform.ts 2>&1 | grep -cE '✅'
echo '=== ui regression (pass count) ==='
npx tsx src/game/verify-ui.ts 2>&1 | grep -cE '✅'
echo '=== map regression (pass count) ==='
npx tsx src/game/verify-map.ts 2>&1 | grep -cE '✅'
echo '=== ai regression (pass count) ==='
npx tsx src/game/verify-ai.ts 2>&1 | grep -cE '✅'
echo '=== audio regression (pass count) ==='
npx tsx src/game/verify-audio.ts 2>&1 | grep -cE '✅'
echo '=== save regression (pass count) ==='
npx tsx src/game/verify-save.ts 2>&1 | grep -cE '✅'
echo '=== battle worker regression (pass count) ==='
npx tsx src/game/verify-battle.ts 2>&1 | grep -cE '✅'
echo '=== map flow smoke test ==='
npx tsx src/game/smoke-mapflow.ts 2>&1 | tail -4
echo '=== platformer smoke test ==='
npx tsx src/game/smoke-platformer.ts 2>&1 | tail -8
echo '=== render smoke test ==='
npx tsx src/game/smoke-render.ts 2>&1 | tail -3
echo '=== minimap smoke test ==='
npx tsx src/game/smoke-minimap.ts 2>&1 | tail -3
echo '=== hud smoke test ==='
npx tsx src/game/smoke-hud.ts 2>&1 | tail -3
echo '=== fx smoke test ==='
npx tsx src/game/smoke-fx.ts 2>&1 | tail -3
echo '=== meta smoke test ==='
npx tsx src/game/smoke-meta.ts 2>&1 | tail -3
echo '=== vite build ==='
npx vite build 2>&1 | tail -8
