# Plan — Issue #3: Reshuffle the whole stage on a correct match

**Repo:** `lukaszczernal/spotifun` · **Base:** `3c29353` · **Branch:** `factory/issue-3`

## Goal

Today, when the player correctly matches the mystery song to its cover, exactly one cover is
replaced and the other three stay put. After this change, a correct match replaces **all four**
covers in a single transition: four fresh tracks when the pool allows, otherwise the remaining
covers are re-shuffled into new positions. The mystery track and its audio preview change with the
new stage, and the covers fade in as a group.

Done means: on a correct match all four cover images change (or demonstrably change position);
a playlist yields the same number of playable rounds as it does today (no shortening of the game);
`npx tsc --noEmit` reports no new `src/` errors beyond the one pre-existing baseline error; and
`npx vite build` succeeds.

## Scope

**In**
- `src/services/useTrackStore.ts` — split initial-fill from reshuffle; add `staged` recycling; add a `reshuffleStage` action; make the mystery-track selection explicit and reshuffle-driven.
- `src/Stage/Stage.tsx` — call the reshuffle after the correct-match animation resolves.
- A small headless test harness proving stage/pool behaviour (no test runner exists yet).

**Out**
- Any change to the Deezer fetch layer (`usePlaylist.ts`, `jsonp.ts`).
- Scoring (`gameAction.addScore` is commented out upstream and stays that way).
- Restyling covers, the grid, or the record animations.
- Fixing the pre-existing `Cover.tsx(74,14)` TS2454 baseline error, or the missing `Hammer` import in `Cover.tsx`/`Splash.tsx` (verified harmless at runtime — see Assumptions).
- The Hammer Manager leak in `Cover.tsx` — real but pre-existing; see Risks.

---

## Phase 1 — Stage composition in the store

**File:** `src/services/useTrackStore.ts`

The current `createEffect` (lines 36-50) does double duty: initial fill *and* one-slot replacement.
That conflation is the root cause. Split it.

1. **Narrow the effect to initial fill only.** It should draw tracks while
   `trackStore.stage.length < STAGE_SIZE` and otherwise do nothing. Remove the
   `findIndex((item) => item.guessed)` branch and the `updateTracksStore("stage", [...trackStore.stage])`
   reactivity hack on line 49 — the reshuffle now writes the array in one call, which is
   already a fresh reference.

2. **Add `releaseStagedTracks()`.** For every stage member that is **not** guessed, set
   `tracks[i].staged = false`, returning it to the draw pool. This is mandatory: `markAsStaged`
   never clears `staged` and `nextFreeTrack` requires `!guessed && !staged`, so without it a
   reshuffle burns 4 tracks per match while guessing 1.

3. **Add `reshuffleStage()`**, exported from the hook:
   - call `releaseStagedTracks()` first;
   - draw up to `STAGE_SIZE` fresh tracks via the existing `drawNextTrack()`;
   - if `STAGE_SIZE` fresh tracks are available, write them in **one** `updateTracksStore("stage", next)` call;
   - if fewer are available (small/late-game playlist), fall back to **repositioning**: keep the
     unguessed covers, shuffle their order, top up with whatever fresh tracks exist, and write once.
     The issue explicitly permits this ("all the covers should be new **or should change their placement**").
   - Guard: if the resulting stage would have fewer than `STAGE_SIZE` entries, leave the stage
     untouched rather than rendering a short grid.

4. **Make the mystery track explicit.** Replace
   `createMemo(() => trackStore.stage[getRandomInt(4)])` (lines 52-55) with a mystery **index
   signal** that is set deliberately — on initial fill and on each `reshuffleStage()` — and a memo
   reading `trackStore.stage[mysteryIndex()]`. Two reasons: the hardcoded `4` must be `STAGE_SIZE`,
   and a memo that calls `Math.random()` in its body recomputes unpredictably. In the repositioning
   fallback, pick the new index from the covers that are **not** the just-guessed track, so the same
   song cannot immediately repeat (measured ~25% chance of an accidental repeat otherwise).

**Verification**
```bash
cd spotifun
node .artifacts/repro/recycle-repro.mjs   # reshuffle-recycle column must equal replace-one
npx tsc --noEmit 2>&1 | grep '^src/'      # only the known Cover.tsx(74,14) baseline error
```

---

## Phase 2 — Trigger the reshuffle from the Stage

**File:** `src/Stage/Stage.tsx`

1. Pull `reshuffleStage` from the `useTrackStore({ playlistId })` destructure (line 36-37).
2. In `checkRecord`, inside the existing `recordAnimation(recordRef).finished.then(...)` correct
   branch (lines 144-152), call `reshuffleStage()` immediately after `markAsGuessed(selected())`.

Ordering matters: it must run **after** `slideRecordInside` resolves, never before. `PlayerControls`
has `createEffect(() => load(track?.()?.track.previewUrl))`, so changing the mystery track swaps the
audio source; doing that mid-animation would cut the preview off while the record is still sliding.

Leave the incorrect-guess branch (lines 148-151) untouched — it keeps the same mystery track so the
player can retry, which a reshuffle would make impossible.

**Do not add a re-reveal call.** Verified: the existing reveal effect at lines 76-81 re-fires after
`<For>` swaps in the new nodes and animates all four fresh covers to `opacity: 1`. The commented-out
`hideCovers` block (lines 84-90) stays commented.

**Verification**
```bash
node .artifacts/repro/reveal-order-repro.mjs   # runner: see Phase 3
npx vite build --logLevel error                # must succeed
```

Manual check with `npm run dev` on `/game/<playlistId>`: play, select the correct cover, swipe up —
all four covers should change, a new preview should load, and the covers should fade in together.

---

## Phase 3 — Lock the behaviour in with a headless harness

There is no test runner in `package.json` and adding one is out of proportion here. The repo already
carries the reproduction scripts used to diagnose this issue; extend that pattern into a checked-in
regression harness under `.artifacts/repro/`.

1. **`stage-behaviour-repro.mjs`** — drive the real store logic and assert:
   - initial fill produces exactly `STAGE_SIZE` covers;
   - after a correct match **all four** stage entries differ from the previous four;
   - the guessed track never returns to the stage;
   - matches-per-playlist equals the pre-change baseline (10→7, 25→22, 50→47).
2. Keep `recycle-repro.mjs` as the pool-exhaustion guard.
3. Keep `reveal-order-repro.jsx` + `reveal.config.mjs` + `reveal-runner.mjs` as the reveal-ordering
   guard. Note it must be **built** first, because Solid's default Node resolution picks the server
   build where `createEffect` never runs:
   ```bash
   NODE_OPTIONS=--max-old-space-size=2048 npx vite build --config .artifacts/repro/reveal.config.mjs --logLevel error
   node .artifacts/repro/reveal-runner.mjs
   ```
   Plain `node` on store-only scripts needs `--conditions browser` for the same reason.

**Verification** — all scripts exit cleanly and print their expected assertions.

---

## Risks

| Risk | Catch it by |
| --- | --- |
| **Track pool drains 4x faster** if `staged` recycling is missed — the headline trap. Measured: a 25-track playlist drops from 22 matches to 6. | `recycle-repro.mjs`; the recycle column must equal replace-one. |
| **Stage strands on small playlists.** The old effect returned early when `drawNextTrack()` was empty, leaving stale covers. | The repositioning fallback plus the "never write a short stage" guard; test with a 5-track playlist. |
| **Audio cuts off mid-animation** if the reshuffle fires before `slideRecordInside` resolves. | Keep the call inside the `.finished.then()` correct branch; verify by ear in `npm run dev`. |
| **Same song repeats** via the fallback re-randomizing onto the same slot (~25%). | Exclude the just-guessed track when choosing the new mystery index. |
| **Hammer Manager leak amplifies.** `Cover.tsx:65-67` calls `Hammer.off`, which is the static `removeEventListeners` (`hammerjs/hammer.js:2618`) and does not destroy the Manager built in `onMount`. `<For>` is reference-keyed, so all four covers remount per reshuffle — 4 leaked Managers per match instead of 1. Pre-existing and out of scope, but the reshuffle makes it 4x worse. | Out of scope; file a follow-up. If trivially fixable, switch `onMount` to hold the instance and call `.destroy()` in `onCleanup` — mirrors the correct pattern already at `Stage.tsx:63-65`. |
| **Reveal effect stops re-firing** if its `stageTracks()[STAGE_SIZE - 1]` gate is refactored. | `reveal-order-repro` guard. |

---

## Assumptions

1. **Reshuffle only on a correct match.** The incorrect branch keeps the mystery track for a retry; reshuffling there would make the retry unanswerable.
2. **The mystery track changes with the stage.** All four covers become new, so the memo reading off `stage` necessarily yields a new track — verified it also triggers exactly one new `load()`.
3. **Repositioning is the small-playlist fallback**, not ending the game — the issue's "or should change their placement" clause sanctions it.
4. **No test runner is added.** `package.json` has no test script; the harness follows the existing `.artifacts/repro/` convention rather than imposing Vitest.
5. **Correction to triage — no extra re-reveal phase is needed.** Triage predicted new covers would "pop in with no transition" and that `showCovers` must be re-run manually. Verified false: the gating effect re-fires post-`<For>` and reveals all four new nodes. Phase 2 is correspondingly smaller.
6. **Correction to triage — the missing `Hammer` import is harmless.** `Cover.tsx:60` and `Splash.tsx:19` use a bare `Hammer` global with no import. This looked like a latent crash. Verified safe: `hammerjs/hammer.js:2631` runs `freeGlobal.Hammer = Hammer` unconditionally, independent of the UMD branch Vite strips, so the global exists in the built bundle. `@types/hammerjs` covers the types. Left alone.
7. **`getRandomInt(4)`'s hardcoded `4` is folded into this change** rather than deferred, since the mystery selection is being reworked anyway and `STAGE_SIZE` is the correct source.
8. **The line-49 reactivity hack is removed, not preserved** — the reshuffle assigns a new array reference, making it redundant.
9. **Scope stays at the store + Stage trigger.** Cover/animation internals are untouched.

## Open questions

None blocking. Two product calls were resolved by the issue text itself (reshuffle on correct match
only; repositioning is acceptable when fresh tracks run out). If the maintainer wants the game to
**end** instead of repositioning once the pool is exhausted, that is a one-line change to the Phase 1
fallback and can follow as a separate item.
