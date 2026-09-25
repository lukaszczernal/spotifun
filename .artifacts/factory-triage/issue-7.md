<!-- mastra-factory-triage -->

|                |                                                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**       | feature request — a fixed-length round with hit/miss scoring is net-new gameplay; the app has never had a round boundary or a working score record.  |
| **Route**      | Await approval                                                                                                                                       |
| **Severity**   | 🟠 high — the session never terminates, so the scoreboard is unreachable and every game ends by the player giving up.                                 |
| **Confidence** | high — reproduced headlessly against the real store; the never-ending loop is traced to two specific lines.                                           |
| **Effort**     | medium — one new round-counter concept threaded through the game store, track store, Stage and ScoreBoard; no architectural change, but four files.   |
| **Impact**     | high — the core loop cannot be completed and no workaround exists; the score screen is dead code today.                                               |
| **Next step**  | Confirm the round rules below (10 guesses, wrong guess consumes a guess, `MAX_FAIL_COUNT` retired), then plan the fix.                                |

### Understanding

**The game never ends because scoring is never recorded.** There are two independent causes, and fixing either alone is not enough.

1. **No round limit exists anywhere.** `useTrackStore` (`src/services/useTrackStore.ts`) draws mystery tracks from the playlist pool until the pool is exhausted — `freeTracks()` (L42) filters on `!guessed && !staged`, and `reshuffleStage()` (L76) keeps serving new stages while any remain. There is no counter, no cap, no notion of a round. A 29-track playlist serves **25** mystery tracks before the stage freezes (repro below), and the final state is a frozen stage with no exit — not an end screen.

2. **The only exit condition is unreachable.** `src/Stage/Stage.tsx:158` is the single navigation to `/game/score`:

   ```ts
   failsCount() === MAX_FAIL_COUNT && navigate("/game/score");
   ```

   `failsCount()` is `gameScore.answers.length - scoreCount()` (`src/services/useGame.tsx:24`), and `answers` only grows through `addScore`. The sole call site is **commented out** at `src/Stage/Stage.tsx:163-167` (`// TODO`). So `answers` is permanently `[]`, `failsCount()` is permanently `0`, the `=== MAX_FAIL_COUNT` guard never fires, and the player can never leave the stage. The same emptiness makes `ScoreBoard` (`src/ScoreBoard/ScoreBoard.tsx:17`) render an empty list under a hardcoded score of 0 — it has never displayed a real result.

**Two disconnected sources of truth.** The on-stage HUD (`Stage.tsx:183-186`) reads `guessedCount()` from the *track* store but `failsCount()` from the *game* store. Only the first ever moves. Any round implementation should collapse these onto one authority — the issue's "points" and "fail points" are two halves of one record, which `Score`/`addScore` in `useGame.tsx` already models correctly but unused.

**A wrong guess currently costs nothing.** On an incorrect match `checkRecord` only replays the preview (`Stage.tsx:157-160`) — no reshuffle, no state change, same mystery track. The player retries the identical question indefinitely. The issue's "if a user fails to guess the fail points are counted" implies a wrong guess must consume one of the 10 and advance to the next track; that is a behavioral change, not just a counter addition.

**Playlist size interacts with the cap.** `usePlaylist` only rejects playlists below `STAGE_SIZE` (4). A 10-guess round needs enough distinct tracks to serve 10 mystery tracks plus distractors; the existing end-of-pool fallback in `reshuffleStage()` (L85-90) freezes the stage rather than ending the game, so a short playlist would hang before reaching 10. The round end must be driven by the guess counter, with the pool-exhaustion path also terminating the round rather than freezing.

**Affected surface:** `src/config.ts` (new round-length constant beside `MAX_FAIL_COUNT`), `src/services/useGame.tsx` (round state, guess count, completion), `src/services/useTrackStore.ts` (stop serving at the cap; advance on a miss), `src/Stage/Stage.tsx` (uncomment/restore `addScore`, drive navigation off round completion, fix the HUD totals), `src/ScoreBoard/ScoreBoard.tsx` (renders correctly once `answers` is populated; the `Correct`/blank tag at L35 should show a fail state too).

**Related work:** #3 (PR #4, `3f81ca2`) introduced `reshuffleStage` and deliberately scoped scoring out — its plan states "`gameAction.addScore` is commented out upstream and stays that way". This issue is the follow-up that was deferred there. #5 (PR #6, `b4d1e45`) fixed Hammer cleanup on the same components; no conflict. The README todo "Add stage result - user should see the result of each stage immediately" overlaps and may be satisfied by the same work. The README also claims "Each quiz game is divided into 3 rounds", which matches neither the code nor this issue — it needs updating alongside.

**Suggested direction:** add `ROUND_LENGTH = 10` to `config.ts`; make `useGame` the single authority for the round (guesses taken, correct, failed, `isRoundOver`); call `addScore` on *every* checked answer in `checkRecord`, correct or not; advance the stage on a miss as well as a hit; navigate to `/game/score` when the guess count reaches `ROUND_LENGTH` or the track pool runs dry; retire the now-redundant `MAX_FAIL_COUNT` early-exit unless a three-strikes rule is wanted *in addition*. No new dependency is needed.

### Assumptions

- **Classified as a feature request, not a bug**, despite "the game does not finish" being a real defect. The requested end state — a 10-guess round with point/fail scoring — is gameplay that has never existed in any commit, and the numbers and rules are product decisions. The contained defect (unreachable exit) is real and is captured above; if a maintainer prefers to route the never-ending-game half as a bug, it can be split out and planned immediately.
- **A wrong guess consumes one of the 10.** The issue counts "fail points", which only makes sense if misses are recorded and the round advances past them. The alternative reading — 10 *correct* answers with unlimited retries — would make "fail points" unbounded and the round length indeterminate.
- **"Round" in the issue means one full play session**, matching the ScoreBoard's "One more round" button, not the README's stale "3 rounds per game" claim.
- **`MAX_FAIL_COUNT = 3` is superseded**, not combined. A 10-guess round that also aborts at 3 misses would usually end at 3, making the 10 mostly decorative.
- **10 is a fixed constant, not user-configurable.** The issue states a single number with no selection UI.
- Deezer playlist `394652815` (the only entry in `GameList`) is assumed large enough for 10 guesses; the local mock at `public/api/mocks/playlist.json` has only 5 playable tracks and will need enlarging to exercise a full round offline.

### Open questions

- Should the round end immediately at 10 guesses, or should a maintainer also want the three-strikes early exit preserved on top of it?
- Should the ScoreBoard distinguish *missed* answers visually (the `Correct`/blank tag at `ScoreBoard.tsx:35` currently renders nothing for a wrong answer), and should it show which cover was the right one?
- What should happen when a playlist cannot supply 10 guesses — end the round early with a partial score, or reject the playlist up front in `usePlaylist`?

### Reproduction

Reproduced headlessly against the real `useTrackStore`, using the existing repro scaffolding from #3 with the Deezer fetch stubbed.

```bash
git clone https://github.com/lukaszczernal/spotifun && cd spotifun
npm install
npm install --no-save jsdom
npx vite build --config .artifacts/repro/round-length.config.mjs
node .artifacts/repro/round-length-runner.mjs
```

Harness added at `.artifacts/repro/round-length-repro.jsx` (+ `.config.mjs` / `-runner.mjs`). It loads a 29-track playlist — the size quoted in the issue — plays perfectly, and counts mystery tracks served:

```
playlist size: 29  stage size: 4
  PASS  stage filled
  round 1: 28,8,13,19 -> 11,5,24,26
  ...
  round 25: 20,22,1,21 -> 20,22,1,21   STAGE FROZEN (no new mystery track)
mystery tracks served before the stage froze: 25
  PASS  session serves at least 10 guessable mystery tracks
  FAIL  session stops after exactly 10 guesses  got 25 - the store has no round limit
```

The session runs **25 guesses instead of 10** and then freezes on an unchanging stage rather than ending. The second assertion is the regression guard for this issue and should flip to PASS once the fix lands.

In-browser confirmation of the unreachable exit: `answers` in `useGame` has no writer (`addScore` has zero call sites — `grep -rn addScore src` returns only the definition and the commented block), so `failsCount()` is pinned at `0` and `Stage.tsx:158` can never navigate.

Baseline verified clean before diagnosis: `npx tsc --noEmit` reports **0 errors under `src/`** and `npx vite build` succeeds, so nothing here is a build regression.
