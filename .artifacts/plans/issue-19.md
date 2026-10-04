# Issue #19 — Keep the music and the record running through the correct-answer hold

Amends the hold shipped for issue #14 (commit `f4db32c`). Branch point: `143d1f0`.

## Goal

When a player picks the correct cover, the stage holds on the answer **without
interrupting anything**: the preview keeps playing, the record keeps spinning
where it already sits, and the screen names the song, the performer and a
"Swipe Up to continue" prompt above a `SwipeUpIcon`. The record does **not**
move until the player acts. A swipe-up **or** a tap then stops the music and
runs the whole record slide into the cover, after which the stage advances
exactly as it does today.

Done means: `correct-reveal` asserts this new contract and passes, every other
harness still passes unchanged, and `tsc --noEmit` reports no new `src/` errors.

## Scope

**In**

- `src/Stage/animations.ts` — retire `slideRecordHalfway`; the surviving slide starts from rest.
- `src/Stage/Stage.tsx` — no half-way slide on a hit; `pause()` on release instead of at pick time; add `Hammer.Swipe` beside `Hammer.Tap`; new prompt copy and icon.
- `.artifacts/repro/correct-reveal-repro.jsx` — invert the assertions it currently makes, add music/spin and swipe coverage.
- `.artifacts/repro/README.md` — refresh the `correct-reveal` description.

**Out**

- The wrong-answer path. It keeps its unconditional `pause()` and its timer.
- `PlayerControls.tsx`'s unreachable `onClick={togglePlay}`. It sits behind
  `pointer-events: none` (`PlayerControls.module.css:14`) and never fires;
  deleting it is unrelated cleanup.
- Any change to `usePlayer`, `Player.tsx`, or the spin CSS. The spin already
  follows player state and needs no new code in either direction.

## Design

Three small moves, each following a pattern the repo already uses.

1. **Don't pause at pick time; pause at release time.** `checkAnswer()` currently
   calls `pause()` unconditionally at `Stage.tsx:219`, before correctness is even
   computed (`:224-225`). Move that call so the wrong path still pauses
   immediately and the correct path pauses inside `releaseHold()`.

   Use an explicit `pause()`, **not** `toggle()`. `toggle()` flips whatever state
   it finds (`usePlayer.tsx:31-33`), so a preview already silenced by a blocked
   autoplay or an OS pause synced through `sync()` (`usePlayer.tsx:50-52`) would
   be *started* by the gesture meant to stop it. `continousPlay` stays `true`, so
   the next track still auto-plays via `Player.tsx:70` once `reshuffleStage()`
   swaps it in.

   *Rejected:* pausing in the `presented.then(...)` chain. `releaseHold()` is the
   single point both gestures funnel through, so the stop belongs there and is
   provable by one assertion.

2. **Delete the half-way leg.** `revealCorrectAnswer()` (`Stage.tsx:198-201`)
   drops its `slideRecordHalfway()` call and awaits the hold directly.
   `slideRecordHome()` is unchanged: it drives absolute `translateY` values
   (`-100%` → `-125%` → `100%`), so it works from a resting position of `0` and
   simply travels further on its first leg. `resetRecordPosition()`
   (`Stage.tsx:188-193`) already parks the record at `translateY: 0` after every
   question, so "the same position" is an existing, real resting state.

   `RECORD_SLIDE_DELAY` loses its only consumer when `slideRecordHalfway` goes.
   Delete both — dead code, and `correct-reveal` imports the constant today, so
   leaving it would let a stale assertion keep compiling.

   *Rejected:* keeping `slideRecordHalfway` with a `0%` target. It would emit a
   pointless timeline and leave the harness unable to tell "didn't move" from
   "moved to where it already was".

3. **Swipe beside tap.** `Stage.tsx:89-91` registers only `Hammer.Tap`. Copy the
   `Splash.tsx:19-25` pattern verbatim — `[[Hammer.Swipe, { direction:
   Hammer.DIRECTION_UP }], [Hammer.Tap]]` with a combined `'swipe tap'` handler.
   The existing held-answer branch (`:92-96`) already routes to `releaseHold()`,
   so both gestures release with no extra branching. Prompt copy and icon follow
   `Splash.tsx:40-45`.

   One caveat the executor must respect: with `Hammer.Swipe` registered, the
   play/pause toggle at `:100` now also fires on a swipe over the player area
   when no answer is held. That is acceptable and arguably better — a swipe on
   the record is a deliberate gesture — but it must not be "fixed" by splitting
   the handlers, or the swipe-to-continue would stop working.

## Phases

### Phase 1 — Behaviour

**`src/Stage/animations.ts`**

- Delete `RECORD_SLIDE_DELAY` and `slideRecordHalfway`.
- Keep `slideRecordHome` exactly as it is. Update its doc comment: it is now the
  whole slide, run on the continue gesture, not "the rest" of one.

**`src/Stage/Stage.tsx`**

- Drop `slideRecordHalfway` from the `./animations` import (`:28`).
- `releaseHold()` (`:74-79`) — call `pause()` before resolving. Comment why it is
  `pause()` and not `toggle()` (see Design note 1).
- `revealCorrectAnswer()` (`:198-201`) — becomes
  `waitForContinue(askedTrack).then(() => slideRecordHome(recordRef!).finished)`.
  Update the comment above it: the record now holds where it is, with the music
  still running, until the gesture.
- `checkAnswer()` (`:219`) — the unconditional `pause()` moves into the
  wrong-answer path only. Note `correct` is computed at `:224-225`, *after* the
  current call site, so the pause must move below that computation (either into
  `revealWrongAnswer()` or behind an `if (!correct)`). Prefer the `if (!correct)`
  guard at the existing site for symmetry with the `if (!correct) play()` at
  `:266-268`.
- Gesture registration (`:89-101`) — add the `Hammer.Swipe` recognizer and change
  `hammerRecord.on("tap", ...)` to `hammerRecord.on("swipe tap", ...)`.
- Hold prompt (`:336-347`) — replace `<SplashText subtitle="Tap to continue" />`
  with `<SplashText subtitle="Swipe Up to continue" />` followed by
  `<Animate type={AnimationType.slideUp}>{SwipeUpIcon}</Animate>`, mirroring
  `Splash.tsx:40-45`. Add `import { SwipeUpIcon } from "../assets/images/gestureIcons";`.

Verify:

```bash
cd /workspace/spotifun
npx tsc --noEmit 2>&1 | grep -v '^node_modules/' | grep -v '@babel/core'
```

Expect no output. (`node_modules` noise from `workbox-core` and `@babel/core`
is pre-existing on `143d1f0` and must be filtered, not fixed.)

### Phase 2 — Harness

**`.artifacts/repro/correct-reveal-repro.jsx`**

The player stub (`:51-64`) already counts `play`/`pause`; it needs
`state: () => "play"` so the component tree reflects a playing preview.

Replace the assertions as follows.

- Drop the `RECORD_SLIDE_DELAY` import (`:24`) — the constant no longer exists.
- `:130-133` "picking the correct cover builds a record slide timeline" → invert:
  **no new timeline is created on the pick.** Capture `timelines.length` after
  `resetTimelines()` and assert it is unchanged once the pick settles.
- `:138-141` (slide delay) and `:147-150` (half-way stop) → **delete.** Both
  describe an animation that no longer runs.
- `:153-156` prompt text → assert `"swipe up to continue"` (lower-cased compare,
  as now).
- Add: **the music keeps playing during the hold** — `player.calls.pause === 0`
  between the pick and the gesture.
- Keep `:157-162` (song and performer named), `:165-168` (no guess banked) and
  `:173-176` (covers unchanged) as they are. These are the durable parts of #14
  and must still pass.
- `:189-193` → the gesture now produces the **first and only** record timeline,
  still ending `translateY: "100%"`.
- Add: **the gesture stops the music** — `player.calls.pause === 1` after it.
- Keep `:194-203` (guess banked, prompt cleared, fresh covers).
- Run the whole sequence **twice**: once releasing with a tap, once with a swipe,
  asserting identical outcomes. Use the `gesture(el, type)` helper shape already
  in `stage-round-repro.jsx:17-32` (`clientY: type === "swipe" ? -400 : 10`),
  which this file currently lacks — its local `gesture()` is tap-only.

  A Hammer `DIRECTION_UP` swipe has been confirmed to recognise under jsdom
  using `pointerdown` on the element then `pointermove`/`pointerup` on `window`
  with a large upward `clientY` delta; a plain tap still recognises through the
  same recognizer set. If a single `pointerdown`/`pointerup` pair with a
  negative `clientY` does not trip the recognizer, add intermediate
  `pointermove` events on `window` to supply distance and velocity.

Update the header comment: it describes issue #14's behaviour and is now wrong.

**`.artifacts/repro/README.md`** (`:183-201`) — rewrite the `correct-reveal`
paragraph: the record no longer moves on the pick and the music keeps playing;
either gesture releases. Add #19 to the issue list on `:1`.

Verify:

```bash
cd /workspace/spotifun
npm install --no-save jsdom
npx vite build --config .artifacts/repro/correct-reveal.config.mjs
node .artifacts/repro/correct-reveal-runner.mjs
```

Expect `ALL CHECKS PASSED`, exit 0.

### Phase 3 — Regression sweep

No other harness asserts the half-way slide, but `stage-round` and `auto-check`
both drive the correct-answer path and tap the player area to continue, so both
exercise the changed code.

```bash
cd /workspace/spotifun
for h in stage-round auto-check progress dup-cover fallback cover-leak cover-tap game-list round-length replay-route reveal; do
  [ -f ".artifacts/repro/$h.config.mjs" ] || continue
  npx vite build --config ".artifacts/repro/$h.config.mjs" >/dev/null 2>&1
  printf '%s: ' "$h"
  node ".artifacts/repro/$h-runner.mjs" >/dev/null 2>&1 && echo PASS || echo FAIL
done
```

Every harness must print `PASS`. Any `FAIL` is a real regression from Phase 1 —
investigate before proceeding, do not adjust the harness to match.

Finally, confirm by eye with `npm start`: pick a correct cover, hear the preview
continue and watch the record stay put and keep spinning, then release with both
a swipe and a tap.

## Risks

- **A harness pauses on mount.** The new "`pause` not called during the hold"
  assertion counts calls globally. If anything pauses before the pick, the count
  starts above zero. Snapshot `player.calls.pause` immediately before the pick
  and assert the *delta*, not the absolute, if that shows up.
- **Swipe simulation proves flaky.** Confirmed working in jsdom during planning,
  but it is the only genuinely new technique here. If it misbehaves, add
  intermediate `pointermove` events; do not weaken the assertion to tap-only —
  swipe is the headline gesture of this issue.
- **`continousPlay` interaction.** Pausing on release and letting the next track
  auto-play relies on `continousPlay` staying `true`. If the next question comes
  up silent, check `Player.tsx:64-80` — `onLoadedData` is what restarts it.
- **Swipe now also toggles play/pause** when no answer is held, per Design note 3.
  Intended; confirm it feels right in the manual pass rather than treating it as
  a defect.

## Assumptions

- **Correction carried from triage:** `PlayerControls`' native
  `onClick={togglePlay}` (`PlayerControls.tsx:34`) does **not** fire. An earlier
  triage pass claimed it double-fires with the Hammer tap and needed guarding;
  `pointer-events: none` (`PlayerControls.module.css:14`, present since the
  initial commit `8c90142`) makes it unreachable. There is no stray-toggle
  blocker, which is why stopping the music must be explicit.
- The music stops on the continue gesture, per the maintainer. The record stops
  spinning with it — both derive from the same player state, so one `pause()`
  covers both.
- `pause()` over `toggle()` in `releaseHold()`, so an already-silent preview is
  never started by the gesture meant to stop it.
- "Swipe Up to continue" replaces the old subtitle rather than joining it; one
  prompt line plus the icon matches `Splash` and avoids crowding the song and
  artist names already on screen.
- The copy advertises only the swipe while tap stays supported — the maintainer's
  explicit call.
- `RECORD_SLIDE_DELAY` is deleted rather than kept for reuse: no other consumer,
  and keeping it would let a stale harness assertion compile.
- The spin is left to fall out of player state rather than being driven
  explicitly — the existing CSS already produces the confirmed behaviour.
- Harness changes land in the same commit as the behaviour change, matching how
  `f4db32c` shipped #14's harness with its feature.
- The preview is `loop`ed (`Player.tsx:101`), so it sustains an open-ended hold
  without running out.

## Open questions

None. Product decisions (spin during the hold, swipe affordance and copy, tap
still supported, music stops on the gesture) were all settled by the maintainer
before planning.
