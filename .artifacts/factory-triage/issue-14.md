<!-- mastra-factory-triage -->

|                |                                                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**       | feature request — a UX change to the correct-guess reveal: delay the record slide, hold it half way, and gate the stage advance behind a "tap to continue"                          |
| **Route**      | Await approval                                                                                                                                                                     |
| **Severity**   | 🟢 low — nothing is broken; the hit path resolves correctly today, it just resolves without a beat                                                                                  |
| **Confidence** | high — the whole correct-answer path is one promise chain in `Stage.tsx` plus one timeline in `animations.ts`, and a harness confirms all four requested behaviours are absent      |
| **Effort**     | medium — reshapes the resolution chain in `Stage.tsx` from timer-driven to input-gated, splits the record timeline, adds a prompt, and invalidates two existing regression harnesses |
| **Impact**     | medium — a correct guess is the most common outcome in a round, and the reveal currently passes too fast to read before the stage reshuffles                                       |
| **Next step**  | Maintainer to approve the four behaviours and confirm the open questions below, then plan the change in `src/Stage/Stage.tsx` and `src/Stage/animations.ts`                          |

### Understanding

Not a defect. The stage behaves exactly as written; the request is to add pacing and a player-controlled gate to the correct-answer reveal.

**Where the behaviour lives.** `checkAnswer` in `src/Stage/Stage.tsx:167-218` is the single resolution chain for both outcomes. On a hit it builds `presented = slideRecordInside(recordRef).finished` (`Stage.tsx:181-183`); on a miss it builds a timer chain through `revealWrongAnswer` (`Stage.tsx:160-165`). Everything after the reveal — `addScore`, `markAsPlayed`, `reshuffleStage`, the round-over navigate, and the `isChecking` / record-position reset — hangs off that one promise (`Stage.tsx:185-217`). So the hit path is "animation finishes → stage moves on", with no point at which it waits for the player.

`slideRecordInside` (`src/Stage/animations.ts:3-21`) is a three-leg anime timeline with no delay: `translateY: -100%` over 1400ms, an overshoot to `-125%` over 1000ms, then a 1ms snap to `100%` that parks the record below the viewport for the next question. It runs to completion unconditionally.

**Against the four requested behaviours:**

| Requested                                      | Today                                                                   |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| 500ms delay before the record starts sliding   | starts on the same tick as the pick — no `delay` anywhere in the timeline |
| stop when the record is half slid into the cover | runs all three legs straight through; nothing pauses it                   |
| "tap to continue" at the bottom of the screen  | no such string in `src/`; the only bottom prompt is "Tap to play"        |
| tap finishes the slide, then advance           | the stage advances off `timeline.finished`, never off an input           |

**History.** This path was last touched in `44caf68` ("Check the answer as soon as a cover is picked", PR #11, issue #9), which made picking a cover terminal and removed `slideRecordOutside` along with the second gesture it existed for. That commit deliberately reduced the record area to play/pause only and locked input for the whole resolution (`Stage.tsx:68-73` early-returns on `isChecking()`). This issue partly reintroduces a second gesture — but a confirming one, not a deciding one, so it does not undo #9.

**Suggested direction.** Split `slideRecordInside` into a delayed half-travel leg and a finishing leg, and replace the hit path's `presented` promise with one that resolves on a player tap. The existing `wait()` helper (`Stage.tsx:50-56`) already establishes the pattern the chain relies on: leaving the promise unresolved on unmount so a disposed stage never reshuffles or navigates — a tap-gated promise needs the same treatment in `onCleanup`.

The bottom prompt slot already exists: `.stage__recordAction` renders a `SplashText` inside `styles.stage__playerControls` (`Stage.tsx:258-272`), currently gated on `playerState() === "pause" && !selected() && !isChecking()`. A "tap to continue" prompt belongs in the same slot under a new gate. The tap target is also already wired — the Hammer tap on `playerAreaRef` (`Stage.tsx:65-73`) that today early-returns while `isChecking()`; that guard is the natural branch point.

**Test coverage.** Two harnesses in `.artifacts/repro/` tap the correct cover and assume it resolves on its own: `stage-round-repro.jsx:102-128` plays a full ten-guess round that would stall on the first hit, and `auto-check-repro.jsx:174-184` asserts a correct pick records the guess with no second gesture. Both must be updated to perform the continue tap, and `stage-round.stub-anime.js` — whose `finished` resolves immediately and which exposes no `pause`/`seek` — will need to model whatever the new timeline uses. Updating these is part of the work, not a follow-up.

**Related.** #9/PR #11 (the flow this builds on), #3/PR #4 (the reshuffle the gate now sits in front of). The README lists "Add stage result - user should see the result of each stage imediatelly" as an open todo, which this beat is the natural place for — see open questions.

### Assumptions

- **Classified as a feature request, not a bug.** The issue is written as current-vs-expected, but the "current state" it describes is the intended behaviour shipped in `44caf68`; nothing is malfunctioning.
- **"Half slid in the cover" means roughly half of the first leg's travel** (about `-50%`), i.e. the record is half hidden behind the cover artwork. The `-125%` overshoot and the `100%` snap-reset belong to the post-tap finish, not to the held position.
- **The 500ms delay is measured from the pick**, applying to the slide only — the cover zoom and the pause of the preview stay immediate.
- **The continue tap is taken on the player/record area**, reusing the existing `playerAreaRef` Hammer tap rather than adding a new full-screen target; while the prompt is up that tap must continue instead of toggling playback.
- **The whole tail of the chain moves behind the tap** — scoring, retiring the track, reshuffling, and the round-over navigate stay in their current order and all run after the tap. Visible consequence: the score HUD increments on continue rather than on the pick. Gating only the reshuffle and banking the score earlier was the alternative; keeping one resolution point is simpler and preserves the ordering constraint `44caf68` and `score-timing-repro.jsx` both guard.
- **No auto-advance fallback.** The issue asks for a tap; adding a timeout as well would reintroduce the pacing it is trying to remove. Input is already locked by `isChecking()`, so a stalled stage is not reachable by accident.
- **The wrong-answer path is unchanged** — the issue only addresses a correct guess.
- **The preview stays paused through the hold**, as it is today (`pause()` at `Stage.tsx:173`).
- **Tapping to continue on the tenth correct guess navigates to the score board**, same as the current round-over branch.

### Open questions

- Should the "tap to continue" beat also show the track title and artist? The README todo "Add stage result — user should see the result of each stage immediately" wants exactly this, and this hold is where it would live, but the issue does not ask for it. Scoped out unless a maintainer says otherwise.
- Should a wrong answer get the same tap-to-continue gate instead of its current `REVEAL_DURATION` timer? Leaving them asymmetric is what the issue literally asks for, but it means two different ways to leave a question.

### Reproduction

Reproduced against the real `Stage` component in this repository (`lukaszczernal/spotifun`), not the weather-agent base — the issue is specific to this app's stage component.

Added `.artifacts/repro/correct-reveal-{repro.jsx,runner.mjs,config.mjs,stub-anime.js}`, following the existing harness pattern: it mounts the real `Stage` behind the real routes with a stubbed playlist and player, records every anime timeline instead of driving rAF, taps the cover marked `cover__correct`, and samples the timeline shape, the DOM, and the game store.

```bash
npm install
npx vite build --config .artifacts/repro/correct-reveal.config.mjs
node .artifacts/repro/correct-reveal-runner.mjs
```

Result — the two structural checks pass, all five requested behaviours are absent:

```
  PASS  the stage rendered a full set of covers
  PASS  picking the correct cover builds a record slide timeline
  FAIL  EXPECTED: the record animation starts with a half second delay
  FAIL  EXPECTED: the record animation stops half way into the cover
  FAIL  EXPECTED: a "tap to continue" message is shown while the record waits
  FAIL  EXPECTED: the guess is not banked until the player taps to continue
  FAIL  EXPECTED: the covers do not change until the player taps to continue

  record timeline as built today: translateY=-100% duration=1400 delay=0 | translateY=-125% duration=1000 delay=0 | translateY=100% duration=1
  timeline paused part way: false
  guesses banked immediately after a correct pick: 1
```

The harness is written as the acceptance check for the change: once implemented it should pass clean. The pre-existing `auto-check` harness was also run and still passes, confirming the hit path works as currently designed.
