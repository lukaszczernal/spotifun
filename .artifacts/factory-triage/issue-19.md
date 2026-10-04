<!-- mastra-factory-triage -->

|                |                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**       | feature request — Amends the correct-answer presentation shipped for #14: keep the preview playing and the record still during the hold, and accept a swipe-up as well as a tap to continue. |
| **Route**      | Await approval                                                                                                                       |
| **Severity**   | 🟡 medium — the game is fully playable; this is a deliberate change to how a hit is presented, not a defect.                          |
| **Confidence** | high — every current behavior named in the report is a single, located line, and all four were reproduced against the real `Stage`.   |
| **Effort**     | low — three edits in `src/Stage`, one guard in `PlayerControls`, and an inversion of the existing `correct-reveal` harness assertions. |
| **Impact**     | medium — touches the most frequent moment in the core loop (every correct guess), but only its presentation.                          |
| **Next step**  | Approve the behavior change, then plan it as an amendment to #14 — the `correct-reveal` harness currently asserts the opposite and must be rewritten in the same PR. |

### Understanding

All three "current state" behaviors are intentional and three commits old. `f4db32c` ("Hold a correct answer until the player taps to continue") implemented issue #14, which asked for the hold; this issue keeps the hold but changes what happens during it. The report is accurate — nothing here is broken, the product decision has moved.

**Music stops** — `src/Stage/Stage.tsx:219`. `checkAnswer()` calls `pause()` unconditionally, before it knows whether the pick was right. Correctness is only computed on the next line (`:224-225`), and only the wrong path ever resumes (`:266-268`, `if (!correct) play()`). The correct path never calls `play()` because the preview restarts on its own: `reshuffleStage()` swaps the mystery track, `PlayerControls`' effect (`PlayerControls.tsx:16-19`) loads the new source, and `Player.tsx:70-73` auto-plays it while `continousPlay` is set. So the silence is bounded by the hold, but during the hold — which is now open-ended, waiting on a human — it is total.

**Record moves half way** — `src/Stage/animations.ts:11-22`. `slideRecordHalfway()` parks the record at `translateY: -50%` after a 500ms delay, and `revealCorrectAnswer()` (`Stage.tsx:198-201`) chains it before the wait. The split into two timelines exists purely so the hold reads as a resting point; the `f4db32c` message is explicit that "splitting the slide in two is what makes the pause a resting point rather than a frozen frame". Removing the first leg is therefore safe for the second — `slideRecordHome()` already drives absolute `translateY` values (`-100%` → `-125%` → `100%`), so it works unchanged from a resting position of `0`, only travelling further on its first leg.

**Performer name appears** — `Stage.tsx:336-347`. Already matches the expected state; no change needed.

**Tap or swipe up to continue** — `Stage.tsx:89-91` registers only `Hammer.Tap` on the player area. `Splash.tsx:19-25` is the in-repo precedent for the pair: `[[Hammer.Swipe, { direction: Hammer.DIRECTION_UP }], [Hammer.Tap]]` with a combined `'swipe tap'` handler. The same recognizer list on `playerAreaRef` satisfies the request, and the tap branch at `:92-101` already routes a held answer to `releaseHold()` before falling through to the play/pause toggle.

**Blocker the report does not mention, and the main reason this is not a one-line change.** `PlayerControls` renders its record inside an `<a onClick={togglePlay}>` (`PlayerControls.tsx:34`), nested inside `playerAreaRef`. A real tap on the record fires both Hammer's synthetic tap *and* that native click. Today this is invisible: the preview is already paused during the hold, so the stray toggle starts a track nobody hears before the stage advances. Once the music is left playing, the same stray toggle **pauses it on the very gesture that is supposed to let it continue** — the fix would defeat itself. `togglePlay` needs the same `heldTrack()`/`isChecking()` guards the Hammer handler has at `:93-99`. The identical gap lets a tap start the preview mid wrong-answer reveal today; worth closing in the same pass.

**Second-order decision for planning.** With the music left running, the record keeps spinning throughout the hold, because `PlayerControls` derives its spin class from player state (`PlayerControls.tsx:21-31`). That reads as correct — "the music continues" — but it is a visual change nobody asked for explicitly, so it should be a conscious call rather than a side effect.

**Test coverage.** `.artifacts/repro/correct-reveal-repro.jsx` is a direct, precise guard on the behavior being changed, and it will fail by design: `:147-150` asserts the record stops half way, and the player stub counts the `pause()` call. Its genuinely durable assertions — the guess is not banked during the hold (`:165-168`), the covers do not change (`:173-176`), the prompt names song and performer (`:157-162`) — must survive the rewrite. No test covers the preview continuing or the swipe gesture; both need adding. The harness stubs the player (`:51-64`), so "the music continues" can only be asserted as "`pause` was never called", not as real audio.

**Related.** #14 is the direct parent (PR #17, commit `f4db32c`); #9 established the automatic check that made the pick terminal; #3 introduced the reshuffle this hold sits in front of. No duplicate, no regression.

### Assumptions

- Classified as a feature request, not a bug: the three reported behaviors were specified by #14 and shipped deliberately, so this revises a product decision rather than repairing a fault. This is why the route is approval rather than a direct fix.
- "The music should continue" means the answered track's preview keeps playing through the hold, not that it should survive into the next question. The preview is `loop`ed (`Player.tsx:101`), so it sustains the hold indefinitely, and the existing source swap ends it naturally when the stage advances.
- The wrong-answer path keeps its unconditional `pause()`. The report only addresses correct guesses, and #14 deliberately left misses alone.
- "Should not move half way" means the record holds at its resting position and the whole slide runs on the continue gesture — not that the slide is dropped. The last expected-state line ("the records moves into the cover") confirms the travel still happens, just later.
- Swipe-up is additive, not a replacement for the tap; the report says "tabs or swipe up".
- Bound to the existing player area rather than a new surface, since that is already the continue target.

### Open questions

- Should the record visibly keep spinning during the hold? It is the honest consequence of leaving the music on, but it is also the one change here nobody requested — worth a maintainer's nod before it ships.
- Should a swipe-up affordance be drawn during the hold? `SwipeUpIcon` already exists in `src/assets/images/gestureIcons.tsx` and `Splash` pairs it with its prompt; the current copy says only "Tap to continue".

### Reproduction

Reproduced against the real `Stage` component using the repo's own harness for this exact flow, which mounts `Stage` behind real routes with recorded (not rAF-driven) anime timelines.

```bash
cd /workspace/spotifun
npm install --no-save jsdom
npx vite build --config .artifacts/repro/correct-reveal.config.mjs
node .artifacts/repro/correct-reveal-runner.mjs
```

All twelve checks pass, which is the confirmation: the harness asserts today's behavior, and the issue asks for its opposite. The run prints the record slide as `translateY=-50% duration=700 delay=500` on the pick — the half-way move to be removed — and the full `-100% → -125% → 100%` travel deferred to the tap. The silence is not asserted by the harness but is read directly from the unconditional `pause()` at `Stage.tsx:219` against the correct path's lack of any matching `play()`.

The `mastra-ai/weather-agent` base was not applicable: this is a Solid.js front-end game with no agent surface, and the project already carries a purpose-built harness for the flow under investigation.
