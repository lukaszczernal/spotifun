# Plan — Issue #7: the gameplay round should let the player guess 10 songs

Repo `lukaszczernal/spotifun`, base commit `ca10a91`. No test framework exists; this
repo verifies behaviour with headless harnesses under `.artifacts/repro/` (pattern
established by #3 / PR #4). This plan follows that grain.

## Goal

A play session becomes a bounded round of exactly `ROUND_LENGTH` (10) guesses. Every
checked answer — hit or miss — is recorded once in the game store, consumes one of the
10, and advances the stage to a new mystery track. When the tenth answer is recorded the
player is sent to `/game/score`, which shows the real tally (correct count, each answer
marked Correct or Missed). Done means: `.artifacts/repro/round-length-runner.mjs` and
`.artifacts/repro/score-timing-runner.mjs` both exit 0, `npx tsc --noEmit` reports no
error under `src/`, and `npx vite build` succeeds.

## Verified understanding

Re-confirmed against the working tree at `ca10a91`:

1. **No round limit exists.** `useTrackStore` serves mystery tracks until the pool
   empties (`freeTracks()` L42, `reshuffleStage()` L76). A 29-track playlist serves **25**
   guesses and then freezes on an unchanging stage (`reshuffleStage` L85-90 bails out
   rather than ending the game). Reproduced: `round-length-runner.mjs`.
2. **The only exit is unreachable.** `Stage.tsx:158` gates navigation on
   `failsCount() === MAX_FAIL_COUNT`; `failsCount()` derives from `gameScore.answers`,
   which only grows via `addScore`, whose sole call site is commented out at
   `Stage.tsx:163-167`. `answers` is permanently `[]`.

Two findings **new to this planning pass**, both of which change the work:

3. **The commented-out `addScore` block does not compile.** Restoring it verbatim yields
   `Stage.tsx(165,11): error TS2322: Type 'Track | undefined' is not assignable to type
   'TrackStageItem | undefined'` — `selected()` is a `Track`, but `Score.selectedTrack` is
   a `TrackStageItem`. Un-commenting is not sufficient; the `Score` shape must be fixed.
4. **The commented-out call sits in the wrong link of the promise chain.**
   `reshuffleStage()` runs in the first `.then()` (L156) and swaps the mystery track
   *synchronously*; the commented `addScore` is in the *next* `.then()` (L162), where
   `mysteryTrack()` already returns the **next** question. Proven by
   `.artifacts/repro/score-timing-runner.mjs`: asked about track 17, `addScore` would
   record 14. Naively restoring the call would silently record wrong answers. The values
   must be captured before the stage advances.

## Scope

**In:** round length constant; round state and completion in `useGame`; `Score` type fix;
recording every answer; advancing the stage on a miss; navigation to the scoreboard on
round end and on pool exhaustion; HUD reading one source of truth; ScoreBoard missed
state; retiring `MAX_FAIL_COUNT`; enlarging the local mock playlist so a full round is
playable offline; the stale README round claim.

**Out:** countdown, confetti and per-stage result (other README todos); playlist
selection UI; persistence or high scores; difficulty settings; animation changes;
retry-on-miss (a miss ends that question, see Assumptions).

## Phase 1 — Round state and a `Score` that compiles

**`src/config.ts`** — add `export const ROUND_LENGTH = 10;`. Leave `MAX_FAIL_COUNT` in
place for now (removed in Phase 3, so each phase builds independently).

**`src/services/useGame.tsx`** —
- Change `Score` to `{ correctTrack?: Track; selectedTrack?: Track }` (import `Track`,
  drop `TrackStageItem`). This resolves finding 3 at the root: a score records *tracks*,
  not stage placements.
- Add derived accessors beside `scoreCount`/`failsCount`:
  `guessCount = () => gameScore.answers.length` and
  `isRoundOver = () => guessCount() >= ROUND_LENGTH`.
- Make `addScore` a no-op once `isRoundOver()` is true, so a late animation callback can
  never push an eleventh answer.
- Export `guessCount` and `isRoundOver` from the first tuple element.

**`src/services/gameUtils.ts`** — `isCorrect` compares `correctTrack?.id ===
selectedTrack?.id` (one `.track` hop less). `countCorrect` is unchanged.

**Test** — new `.artifacts/repro/round-state-repro.jsx` (+ `.config.mjs`, `-runner.mjs`),
copying the existing harness scaffolding. Drives `getStore()` directly: pushes 9 answers
(mixed hit/miss) and asserts `isRoundOver()` is false; pushes the tenth and asserts
`isRoundOver()` is true, `guessCount() === 10`, and `scoreCount() + failsCount() === 10`;
pushes an eleventh and asserts `guessCount()` is still 10; asserts `resetGame()` clears
back to 0. Note `getStore` is not currently exported — export it for the harness (the
`GameProvider` remains the app's entry point).

**Verify**
```bash
npx tsc --noEmit 2>&1 | grep '^src/'          # expect no output
npx vite build --config .artifacts/repro/round-state.config.mjs
node .artifacts/repro/round-state-runner.mjs   # expect exit 0
```

## Phase 2 — Track store: retire a track on every answer, report exhaustion

**`src/services/useTrackStore.ts`** —
- Rename the `TrackStageItem.guessed` flag to `played` (in `src/services/model.ts`), and
  `markAsGuessed` to `markAsPlayed`. The flag already means "never serve this again";
  after this change a *missed* track is retired too, so "guessed" would be a lie. Update
  the three readers: `freeTracks()` (L43), `reshuffleStage()`'s `leaving` filter (L77) and
  `resetTracks()` (L125). Semantics are otherwise unchanged.
- Delete the `guessedCount` memo — correctness now lives in `useGame` (Phase 3 switches
  the HUD over). Keep `trackCount`.
- Make `reshuffleStage()` return `boolean`: `false` on the existing "not enough covers
  left" bail-out (L85-90), `true` when it swapped the stage. This turns today's silent
  freeze into a signal the caller can act on.

**Test** — extend `.artifacts/repro/round-length-repro.jsx`: keep the existing assertions,
and add one that `reshuffleStage()` returns `false` exactly when the stage stops
advancing, instead of inferring the freeze by comparing cover ids. The
"stops after exactly 10 guesses" assertion stays **failing** until Phase 3 — it asserts
on session length, which the Stage owns.

**Verify**
```bash
npx tsc --noEmit 2>&1 | grep '^src/'
npx vite build --config .artifacts/repro/round-length.config.mjs
node .artifacts/repro/round-length-runner.mjs   # exhaustion assertion PASSes; round-limit one still FAILs
```

## Phase 3 — Stage: record every answer, advance on a miss, end the round

**`src/Stage/Stage.tsx`**, all inside `checkRecord()` (L139-174):

- **Capture before advancing** (fixes finding 4). At the top of the handler, before any
  animation resolves, read the question into locals:
  `const askedTrack = mysteryTrack()?.track; const answeredTrack = selected();`
  Use those locals for `addScore`, never the live accessors.
- **Collapse the chain.** Replace the three chained `.then()`s with a single `.finished.then()`
  body so ordering is explicit: record the score first, then mutate the stage, then clear
  the selection. Recording first also means `isRoundOver()` is accurate when checked.
  ```ts
  recordAnimation(recordRef).finished
    .then(() => {
      gameAction.addScore({ correctTrack: askedTrack, selectedTrack: answeredTrack });

      markAsPlayed(askedTrack);          // retire the question, hit or miss
      const advanced = reshuffleStage();

      if (isRoundOver() || !advanced) {
        navigate("/game/score");
        return;
      }
      if (!correct) play();              // next preview, only when the round continues
    })
    .then(() => {
      setSelected();
      setIsChecking(false);
      resetRecordPosition();
    });
  ```
  `markAsPlayed(askedTrack)` replaces `markAsGuessed(selected())` and now runs on **both**
  branches — this is the behavioural change that makes a miss consume one of the 10 and
  move to a new song. The `correct` flag still selects the record animation (L147) exactly
  as today.
- **Remove the dead exit.** Delete `failsCount() === MAX_FAIL_COUNT && navigate(...)`
  (L158) and drop `MAX_FAIL_COUNT` from the import (L16) and from `src/config.ts`.
- **One source of truth in the HUD** (L181-187): render `Score: {scoreCount()}`,
  `Fails: {failsCount()}`, and replace the `Total: {trackCount()}` line with
  `Guess: {guessCount()} / {ROUND_LENGTH}`, which is what the player actually needs. Pull
  `scoreCount`, `guessCount`, `isRoundOver` from `GameContext` (L34); drop `guessedCount`
  and `trackCount` from the `useTrackStore` destructure (L36-43).
- `onMount`'s `gameAction.resetGame()` (L75) already starts each visit clean — keep it.

**Test** — `.artifacts/repro/score-timing-repro.jsx` (added during this planning pass,
currently FAILing) is the regression guard for finding 4. Update it to mirror the new
capture-then-advance order and assert the recorded `correctTrack.id` equals the track the
player was asked about; it must flip to PASS. Extend
`.artifacts/repro/round-length-repro.jsx` to drive the full loop — `addScore` +
`markAsPlayed` + `reshuffleStage` per iteration, stopping on `isRoundOver()` — and assert
the session stops at exactly 10 on a 29-track playlist, and that a 13-track playlist also
reaches 10 (covering reuse of `leaving` covers near pool end).

**Verify**
```bash
npx tsc --noEmit 2>&1 | grep '^src/'
npx vite build --config .artifacts/repro/score-timing.config.mjs && node .artifacts/repro/score-timing-runner.mjs
npx vite build --config .artifacts/repro/round-length.config.mjs && node .artifacts/repro/round-length-runner.mjs
npx vite build
```
All four commands must succeed; both runners must now exit 0.

## Phase 4 — Scoreboard, mock playlist, README

**`src/ScoreBoard/ScoreBoard.tsx`** — with `answers` populated this screen renders for the
first time. Update the field hops for the new `Score` shape (`score.selectedTrack?.album
.coverMedium`, `score.correctTrack?.name`, `score.correctTrack?.artist`). Change the tag
(L34-36) from `isCorrect(score) ? 'Correct' : ''` to render `Missed` on the other branch,
and show the *correct* cover as the thumbnail when the answer was wrong, so the player
learns the answer. Headline becomes `${scoreCount()} / ${ROUND_LENGTH}`.

**`public/api/mocks/playlist.json`** — currently 6 tracks, 5 with a preview, so the offline
mock cannot play a 10-guess round. Extend to ~20 preview-bearing entries following the
existing `DeezerTrack` shape.

**`README.md`** — replace "Each quiz game is dividied into 3 rounds" with a sentence
describing one round of 10 guesses.

**Verify** — `npx vite build`, then serve `dist/` and play a full round against the mock
(omit the playlist id so `resolvePlaylistUrl` uses `api/mocks/playlist.json`): confirm the
HUD counts to 10, a wrong answer advances to a new song and increments Fails, and the
scoreboard lists 10 rows with correct/missed tags.

## Risks

- **Double-recording from animation callbacks.** `checkRecord` guards re-entry with
  `isChecking()` (L140), and Phase 1's `addScore` no-op past `ROUND_LENGTH` is the second
  line of defence. Catch it with the harness assertion that an eleventh push is ignored.
- **Navigating away mid-animation.** The round now ends inside an animation callback;
  `onCleanup` calls `resetPlayer()` (L78-80) and PR #6 made the Hammer manager clean up on
  unmount, so teardown is covered. Check manually that no preview keeps playing on the
  scoreboard.
- **Renaming `guessed` → `played`** touches `model.ts` and three call sites; a missed one
  is a type error, so `tsc --noEmit` catches it. Low risk, high readability payoff.
- **Short playlists.** A playlist that cannot supply 10 questions now ends the round early
  with a partial score via the `!advanced` branch rather than freezing — strictly better
  than today, but confirm the scoreboard reads sensibly with fewer than 10 rows.
- **`getStore` export** is added for the harness. It is additive and `GameProvider` stays
  the app's only consumer.

## Assumptions

1. **A miss consumes one of the 10 and advances to a new song.** The issue counts "fail
   points", which is only meaningful if misses are recorded; unlimited retries would make
   the round length indeterminate. This is a deliberate behaviour change from today's
   replay-the-same-preview loop.
2. **`MAX_FAIL_COUNT = 3` is retired, not combined.** Keeping a three-strikes exit
   alongside a 10-guess round would usually end the game at 3, making the 10 decorative.
3. **A playlist too small for 10 guesses ends the round early with a partial score**
   rather than being rejected up-front in `usePlaylist`. The store already has the
   reuse-and-exhaust path; surfacing it as a round end is the smaller change, and raising
   the `usePlaylist` minimum would reject playlists that are playable today.
4. **`Score` holds `Track`, not `TrackStageItem`** — required by finding 3, and `guessed`/
   `staged` are stage bookkeeping with no meaning in a finished answer.
5. **The `guessed` flag is renamed `played`** because it now retires missed tracks too.
6. **"Round" means one full play session**, matching the ScoreBoard's existing "One more
   round" button; the README's "3 rounds" line is stale and is corrected in Phase 4.
7. **10 is a fixed constant**, not user-configurable — the issue names a single number and
   there is no settings surface.
8. **Verification is by headless harness**, not a new test framework: the repo has no test
   runner and `.artifacts/repro/` is the established convention from #3. Adding Vitest is
   out of scope for this issue.
9. `.artifacts/repro/out*` is gitignored but the harness sources are not, matching how #3
   and #5 left their harnesses in the tree.

## Open questions

None blocking. One product call a maintainer may want to revisit after seeing it play:
whether a missed question should briefly reveal the correct cover on the stage before
advancing (today the reveal only happens on the scoreboard). This plan does not implement
an on-stage reveal — it overlaps the separate README todo "Add stage result".
