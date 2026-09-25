<!-- mastra-factory-triage -->

|                |                                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**       | feature request — replaces the two-gesture guess flow with an automatic check on selection, and adds a new wrong-answer reveal state that does not exist today. |
| **Route**      | Await approval                                                                                                                                                 |
| **Severity**   | 🟡 medium — the game is fully playable today; the second gesture is friction, not a defect.                                                                    |
| **Confidence** | high — the current behaviour is reproduced headlessly against the real `Stage`, and every touch point is traced.                                               |
| **Effort**     | medium — reworks the resolve flow in `Stage.tsx`, adds a reveal state to `Cover`, new colour/timing config, and removes the now-dead swipe UI.                 |
| **Impact**     | medium — it touches every guess in the core loop, but there is no blocked workflow and no workaround needed.                                                    |
| **Next step**  | Confirm the three behaviour decisions under *Open questions* (mainly what the music does after a wrong answer), then plan the fix.                              |

### Understanding

This is a **UX flow change**, not a bug. Everything the issue describes as "current state" is the intended design of the code as written — the request is to collapse two gestures into one and to add a reveal step that has never existed.

**Where the guess is resolved today.** Tapping a cover only records a selection: `toggleCoverSelection` (`src/Stage/Stage.tsx:106`) sets the `selected` signal and nothing else. The only caller of `checkRecord()` is the Hammer handler bound to the record area (`src/Stage/Stage.tsx:55-62`), which fires on `swipe` **or** `tap`. `checkRecord()` (`src/Stage/Stage.tsx:134`) then runs the whole resolution chain: pick the record animation, capture the asked/answered pair, score it, retire the track, reshuffle, and clear the selection. The two-gesture design is also advertised in the UI — the `Swipe up to check` splash and `SwipeUpIcon` (`src/Stage/Stage.tsx:232-241`) render precisely while a cover is selected.

This flow arrived whole in `4330fa9` ("Play a fixed round of 10 songs and show the result", issue #7); `git log` on `Stage.tsx` shows no earlier attempt at an automatic check, so nothing here is a regression.

**What the requested flow needs, area by area.**

1. **Auto-check on selection** — `src/Stage/Stage.tsx`. Selection must drive resolution, so the check moves out of the record gesture into the cover tap (or into an effect on `selected()`). The record-area Hammer handler then collapses to play/pause only, which also removes the awkward `checkRecord(); if (isChecking()) pause(); else togglePlayer();` sequencing at `Stage.tsx:55-62`. The "swipe up" splash/icon block and the `SwipeUpIcon` import become dead and should go. Deselect-by-tapping-again (`Stage.tsx:110`) also disappears: a selection is now terminal for the round.

2. **Correct answer → record slides in** — already implemented. `slideRecordInside` (`src/Stage/animations.ts:3`) runs on `correct` and the post-animation chain retires the track and reshuffles. This path needs re-wiring to the new trigger, not new behaviour.

3. **Wrong answer → return, stop, reveal, reshuffle** — the genuinely new work, and it splits into four pieces:
   - *Cover goes back to the stage.* `Cover` animates purely off the `isSelected` prop (`src/components/Cover/Cover.tsx:31-57`), so clearing `selected()` immediately animates the cover home. But the red border must outlive that, so the wrong track's identity has to be tracked in a **separate signal** from `selected()` — reusing `selected()` for both will make the border vanish with the zoom.
   - *Music stops.* `pause()` exists on the player context (`src/services/usePlayer.tsx:20`). Note the wrong path currently does the opposite of the request: after reshuffling it calls `play()` (`src/Stage/Stage.tsx:169-171`) to auto-start the next preview.
   - *Green/red borders.* **This is the trap.** `Cover` already receives `isCorrect` for every cover and unconditionally stamps `cover__correct` onto the correct one (`src/components/Cover/Cover.tsx:81`), from the moment the stage renders. It is harmless today only because `Cover.module.css` defines no rule for that class. Attaching a green border to it as-is would reveal the answer for the whole round — the reproduction below locates the right cover through exactly that class. The reveal must be gated on a "revealing" state, and a wrong-state class is needed alongside it. `src/index.css` has only `--accent-light: #0C884D`; a failure colour needs adding.
   - *"After a few seconds."* No delay constant exists. `src/config.ts` holds `STAGE_SIZE`/`ROUND_LENGTH` and is the natural home for a `REVEAL_DELAY`. The reveal window must be covered by the existing `isChecking()` guard so taps during it are ignored, and the timer must be cleared on unmount so a late callback cannot reshuffle a disposed stage.

**Ordering constraint worth preserving.** `checkRecord()` deliberately captures `askedTrack`/`answeredTrack` *before* `reshuffleStage()` (`src/Stage/Stage.tsx:144-148`), because the reshuffle swaps in a new mystery track synchronously. Any rework must keep that capture, or scores will record the *next* question. Likewise `gameAction.addScore` is guarded by `isRoundOver()` (`src/services/useGame.tsx:33`) so a late timer cannot append an eleventh answer — the new delayed path should stay inside that guard rather than around it.

**Suggested direction.** Keep `checkRecord()` as the single resolution function and change only its trigger and its wrong-answer branch: on wrong, `pause()`, clear `selected()`, set a `revealed` signal holding the correct and wrong track ids, wait `REVEAL_DELAY`, then run the existing retire/reshuffle/navigate tail. The correct branch is unchanged apart from the trigger. No new abstraction is warranted, and `slideRecordOutside` becomes unused if the wrong answer no longer moves the record — delete it rather than leave it orphaned.

**Test coverage.** The project has no test runner; the headless harnesses under `.artifacts/repro/` are the only regression guards. `.artifacts/repro/stage-round-repro.jsx` drives a full round through the real component and **taps a cover, then swipes the record** — it will break the moment the check becomes automatic and must be updated as part of the change, not after it.

**Related issues/PRs.** #7 / PR #8 (`4330fa9`) introduced this flow and the round/score loop. #3 / PR #4 established whole-stage reshuffle on a resolved guess, which the wrong path now reuses after a delay. #5 / PR #6 fixed Hammer manager leaks in `Cover` — the new tap wiring must keep using `destroy()` (`src/components/Cover/Cover.tsx:69-74`). No duplicates found; no open PR touches this area.

### Assumptions

- Read as a feature request, not a bug: the "current state" in the issue matches the code's intended design and shipped in #7, so nothing regressed.
- "The cover goes back to the stage" means the selected cover's zoom-in animation reverses to its grid position, not that the stage re-renders.
- The green/red borders stay on screen for the same "few seconds" window that precedes the reshuffle, and both clear at reshuffle.
- The reveal delay is a single new constant in `src/config.ts`; ~2-3s assumed pending confirmation.
- A correct answer keeps its current behaviour end to end — record slides in, then the stage advances — since the issue only re-specifies the trigger for it.
- Input is locked for the whole reveal window via the existing `isChecking()` guard, so a player cannot select during the reveal.
- The `.artifacts/repro/stage-round-repro.jsx` harness is updated in the same change, since the automatic check invalidates its swipe step.
- Scored as medium effort / medium impact: four files and a new timed state machine, affecting every guess but with the game playable as-is.

### Open questions

- **After a wrong answer, does the music stay stopped or auto-resume on the next round?** The issue says the music stops, but the current code explicitly calls `play()` after reshuffling a wrong guess (`Stage.tsx:169-171`). Keeping that means the silence lasts only for the reveal window; dropping it means the player must tap to start each subsequent song. This is a feel decision.
- **How long is "a few seconds"?** Proposed 2.5s — long enough to read both borders, short enough not to stall the round.
- **Should the record still animate on a wrong answer?** `slideRecordOutside` currently plays; the new description gives the record no role in the wrong path, which would leave that animation unused.

### Reproduction

Confirmed against the real `Stage` component, with `usePlaylist` stubbed and `animejs` resolved instantly (same harness pattern as the existing checks).

```bash
npm install
npm install --no-save jsdom
npx vite build --config .artifacts/repro/auto-check.config.mjs
node .artifacts/repro/auto-check-runner.mjs
```

Result — every assertion describing the reported behaviour passes:

```
PASS  the stage rendered a full set of covers
PASS  REPORTED: selecting a wrong cover did not resolve the guess
PASS  REPORTED: the UI asks for a second gesture instead of checking
PASS  REPORTED: the music is not stopped on a wrong selection
PASS  REPORTED: no cover is marked wrong after selecting it
PASS  the guess was only recorded after the record swipe
PASS  REPORTED: selecting the correct cover does not start the record animation either
```

Manually: `npm start`, pick a playlist, tap the record to play, tap a cover — the cover zooms in, the audio keeps playing, and the UI shows "Swipe up to check". The guess is scored only on the following swipe or tap over the record area.
