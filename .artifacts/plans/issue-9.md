# Plan — Issue #9: selecting a cover should check the answer automatically

Repo `lukaszczernal/spotifun`, base commit `1d87321` (working tree clean apart from the
`.artifacts/` triage output). No test framework exists; this repo proves behaviour with
headless harnesses under `.artifacts/repro/` (pattern established by #3 / PR #4 and
extended by #7 / PR #8). This plan follows that grain.

## Goal

Tapping a cover resolves the guess on its own — no second gesture. A correct pick keeps
today's celebration (the record slides in, the stage advances). A wrong pick pauses the
preview, lets the picked cover drop back into the grid, marks the correct cover green and
the picked one red, holds that reveal for a readable beat, then reshuffles into the next
question. The record area goes back to being only a play/pause control and the "Swipe up
to check" prompt disappears.

Done means: `.artifacts/repro/auto-check-runner.mjs` (rewritten to assert the *new*
behaviour) and `.artifacts/repro/stage-round-runner.mjs` both exit 0, the other seven
harnesses still exit 0, `npx tsc --noEmit` reports nothing under `src/`, and
`npx vite build` succeeds.

## Verified understanding

Re-confirmed against the working tree at `1d87321` during this planning pass:

1. **A cover tap only selects.** `toggleCoverSelection` (`src/Stage/Stage.tsx:106-111`)
   writes the `selected` signal and nothing else. `checkRecord()`
   (`src/Stage/Stage.tsx:134`) has exactly one caller: the Hammer handler on the record
   area (`src/Stage/Stage.tsx:55-62`), bound to `swipe tap`. Proven headlessly by
   `.artifacts/repro/auto-check-runner.mjs`, which currently passes on assertions that
   describe the *reported* behaviour.
2. **The correct path already exists in full.** `slideRecordInside`
   (`src/Stage/animations.ts:3`) plus the `.then()` chain that scores, retires, reshuffles
   and navigates (`Stage.tsx:150-177`). Only its trigger changes.
3. **Nothing of the wrong path exists.** `Cover.module.css` has no reveal styles,
   `src/index.css` has only `--accent-light: #0C884D` and no failure colour, `src/config.ts`
   holds only `STAGE_SIZE`/`ROUND_LENGTH`, and `src/` contains no `setTimeout` outside
   `services/jsonp.ts`. On a wrong answer today the code does the *opposite* of the
   request: it calls `play()` after reshuffling (`Stage.tsx:169-171`).
4. **The capture-before-reshuffle constraint is real and must survive.**
   `Stage.tsx:144-148` snapshots `askedTrack`/`answeredTrack` before `reshuffleStage()`
   swaps the mystery track synchronously (`useTrackStore.ts:95-104`). `addScore` is
   additionally guarded by `isRoundOver()` (`useGame.tsx:32`).
5. **`cover__correct` is stamped unconditionally today** (`Cover.tsx:81`, carrying the
   author's `// TODO I do not like this solution`). It is inert only because no CSS rule
   matches it — and two harnesses locate the mystery cover through it
   (`stage-round-repro.jsx:96`, `auto-check-repro.jsx:91`).

Corrections to the inherited triage understanding, both found in this pass:

6. **Writing `selected` and clearing it in the same synchronous flow makes the zoom
   invisible.** Solid queues effect runs and flushes once, so `Cover`'s effect
   (`Cover.tsx:31-57`) would only ever observe the final value — the cover would never
   leave the grid, and "the cover goes back to the stage" would have nothing to go back
   from. The wrong path therefore has to let the 800ms zoom play before returning the
   cover. That 800ms is hardcoded at `Cover.tsx:34` and becomes a shared constant.
7. **Clearing the reveal *after* `reshuffleStage()` can paint a stale red border.** The
   wrong track is never marked played, so on the end-of-playlist fallback
   (`useTrackStore.ts:81-84`) it can be reused in the very next stage. The reveal must be
   cleared immediately *before* the reshuffle, not in the trailing `.then()`.

## Scope

**In:** automatic check on cover selection; wrong-answer reveal (pause, return cover,
green/red borders, timed reshuffle); new duration constants and a failure colour;
`Cover` reveal prop and styles; removal of the now-dead swipe prompt, swipe recognizer and
`slideRecordOutside`; updating the two harnesses that drive `Stage` through a guess, plus
a new set of assertions for the reveal; `.artifacts/repro/README.md`.

**Out:** removing the `cover__correct` marker (see Assumptions); the record's own
animation on a wrong answer; scoreboard, round length or track-pool behaviour; the
remaining README todos (countdown, confetti, per-stage result); re-theming.

## Phase 1 — Constants, colour and an inert reveal prop on `Cover`

Nothing changes on screen in this phase; it only puts the pieces in place.

**`src/config.ts`** — add two constants beside the existing two:

```ts
/** Cover zoom-in (src/components/Cover/Cover.tsx) - Stage waits for it before
 *  dropping a wrong pick back into the grid. */
export const COVER_ZOOM_DURATION = 800;
/** How long the green/red borders stay up before the stage moves on. */
export const REVEAL_DURATION = 2500;
```

**`src/components/Cover/Cover.tsx`** — import `COVER_ZOOM_DURATION` and use it for the
`duration: 800` at `Cover.tsx:34`, so Stage and Cover cannot drift apart. Add an optional
prop `reveal?: "correct" | "wrong"` to `Props` and render it as a CSS-module class
alongside the existing `className`/`class` pair:

```tsx
const revealClass = () =>
  props.reveal === "correct"
    ? styles.cover__revealCorrect
    : props.reveal === "wrong"
      ? styles.cover__revealWrong
      : "";
...
<a
  className={`${styles.cover} ${revealClass()}`}
  class={`cover ${props.isCorrect ? "cover__correct" : ""}`}
  ref={coverRef}
>
```

Leave the `class` expression and its TODO exactly as they are — the reveal deliberately
uses its own classes (see Assumptions). The prop is optional, so
`cover-leak-repro.jsx:85` and `cover-tap-repro.jsx:48` keep compiling untouched.

**`src/index.css`** — add `--accent-fail: #C0392B;` next to `--accent-light`.

**`src/components/Cover/Cover.module.css`** — add:

```css
.cover__revealCorrect {
  outline: 0.6vh solid var(--accent-light);
}

.cover__revealWrong {
  outline: 0.6vh solid var(--accent-fail);
}
```

`outline`, not `border`: the covers sit in an `aspect-ratio: 1` grid and are driven by
anime transforms, and a border would change their box size mid-animation.

**Verify**

```bash
npx tsc --noEmit 2>&1 | grep '^src/'   # expect no output
npx vite build                          # expect success
```

## Phase 2 — Stage: check on selection, reveal on a miss

All in `src/Stage/Stage.tsx` unless stated.

**Timer plumbing.** Add a single pending-timer handle and a promise helper, cleared on
unmount so a late callback can never reshuffle or navigate on a disposed stage (only one
wait is ever outstanding, so one handle is enough):

```tsx
let revealTimer: ReturnType<typeof setTimeout> | undefined;
const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    revealTimer = setTimeout(resolve, ms);
  });
onCleanup(() => clearTimeout(revealTimer));
```

**Reveal state.** One signal is enough — the reveal is only ever entered on a miss, and it
is cleared before the reshuffle, so the green side can read the live mystery track:

```tsx
const [wrongTrack, setWrongTrack] = createSignal<Track>();

const revealOf = (track?: Track): "correct" | "wrong" | undefined => {
  if (!wrongTrack()) return undefined;
  if (track?.id === wrongTrack()?.id) return "wrong";
  return isCorrect(track) ? "correct" : undefined;
};
```

**Selection resolves the guess.** Replace `toggleCoverSelection` (L106-111) with a
one-way `selectCover`; a pick is now terminal, so tapping the same cover again must not
deselect it:

```tsx
const selectCover = (track: Track | undefined, position: number) => {
  if (isChecking() || !track || !mysteryTrack()) return;
  setSelected(track);
  checkAnswer(track);
};
```

Keep the unused `position` parameter — it is part of `Cover`'s `onClick` contract
(`Cover.tsx:12`). Pass `selectCover` at the `onClick` prop (L208) and add
`reveal={revealOf(track.track)}` to the `<Cover>` call.

**Rename `checkRecord` to `checkAnswer` and take the answer as an argument** (reading
`selected()` back out immediately after writing it is needlessly indirect). The body keeps
the existing capture-then-score-then-reshuffle chain — finding 4 — and only forks on how
the answer is presented:

```tsx
const checkAnswer = (answeredTrack: Track) => {
  if (isChecking() || !recordRef) return;
  setIsChecking(true);
  pause();

  // Capture the question before the stage advances - reshuffleStage() swaps in a
  // new mystery track synchronously, so reading these afterwards would record the
  // next question instead of the one just answered.
  const askedTrack = mysteryTrack()?.track;
  const correct = askedTrack?.id === answeredTrack.id;

  const presented = correct
    ? slideRecordInside(recordRef).finished
    : revealWrongAnswer(answeredTrack);

  presented
    .then(() => {
      gameAction.addScore({
        correctTrack: askedTrack,
        selectedTrack: answeredTrack,
      });

      // Cleared before the stage changes: the wrong track is not retired, so the
      // end-of-playlist fallback can put it straight back on the new stage.
      setWrongTrack();
      markAsPlayed(askedTrack);
      const advanced = reshuffleStage();

      if (isRoundOver() || !advanced) {
        navigate("/game/score");
        return;
      }

      if (!correct) {
        play();
      }
    })
    .then(() => {
      setSelected();
      setIsChecking(false);
      resetRecordPosition();
    });
};
```

`pause()` now runs for both outcomes, which is what the record-area handler did before
(L57-58) and what the issue asks for on a miss. The `if (!correct) play()` tail stays: it
is what restarts the preview after that pause, and `continousPlay` (`usePlayer.tsx:16`,
`Player.tsx:9-14`) already autoplays the next source on the correct path.

**The miss presentation** — the only genuinely new behaviour:

```tsx
// The pick zooms in like any other selection, then drops back into the grid so
// that both borders are readable side by side (finding 6).
const revealWrongAnswer = (answeredTrack: Track) =>
  wait(COVER_ZOOM_DURATION).then(() => {
    setSelected();
    setWrongTrack(answeredTrack);
    return wait(REVEAL_DURATION);
  });
```

**Dead code to remove in the same change:**

- The record-area handler (L55-62) collapses to play/pause, and its recognizer list to
  `[[Hammer.Tap]]` — nothing is swiped on this screen any more, and the surviving prompt
  already reads "Tap to play":
  ```tsx
  hammerRecord.on("tap", () => {
    if (isChecking()) return;
    togglePlayer();
  });
  ```
- The whole `<Show when={selected()}>` "Swipe up to check" block (L232-241) and the
  `SwipeUpIcon` import (L22). The icon itself stays — `Splash.tsx:44` still uses it.
- `slideRecordOutside` in `src/Stage/animations.ts` (L24-34) and its import (L23): the
  record has no role in the new miss path.

**Tests.** Both harnesses that drive a guess through the real `Stage` change, because the
gesture they replay no longer exists.

- **`.artifacts/repro/config.stub.ts` (new)** — re-exports the real `STAGE_SIZE` and
  `ROUND_LENGTH` with `COVER_ZOOM_DURATION = 0` and `REVEAL_DURATION = 0`, so a ten-guess
  round does not take half a minute of wall clock. Alias it in both
  `auto-check.config.mjs` and `stage-round.config.mjs`, next to the existing
  `usePlaylist`/`animejs` aliases. Vite matches the import specifier, so all three forms
  used in the bundle need an entry: `/^\.\.\/config$/` (Stage), `/^\.\.\/\.\.\/config$/`
  (Cover) and `/^\.\.\/\.\.\/src\/config$/` (the harnesses themselves).
- Both harnesses need a macrotask sleep — `settle()` only drains microtasks and the reveal
  now hops through `setTimeout`:
  ```js
  const sleep = (ms = 5) => new Promise((r) => setTimeout(r, ms));
  ```
- **`.artifacts/repro/auto-check-repro.jsx`** — rewrite from "confirms the reported
  behaviour" to "proves the fix", keeping the existing scaffolding (`gesture`, the player
  stub, the real routes). Assert, in order: tapping a wrong cover records the guess with
  no second gesture (`guessCount() === 1`); the preview was paused (`player.calls.pause`
  grew); during the reveal exactly one cover carries `[class*="revealWrong"]` and exactly
  one carries `[class*="revealCorrect"]`, and they are different elements; the wrong
  border sits on the cover that was tapped; no "Swipe up to check" text is rendered any
  more; after the reveal both classes are gone and the stage advanced; a tap on the record
  area does not record a guess; and tapping the correct cover resolves it too
  (`guessCount()` grows, no reveal classes appear). Assert the reveal state *before* the
  delay elapses by reading the DOM between the tap and the sleep.
- **`.artifacts/repro/stage-round-repro.jsx`** — in `answer()` (L98-112), drop the
  `recordArea` swipe and replace it with `await sleep()` after the cover tap. Every
  existing assertion stays as-is; they are the regression guard that the round still ends
  after `ROUND_LENGTH` guesses and still scores the song that was asked about.

**Verify**

```bash
npx tsc --noEmit 2>&1 | grep '^src/'
npx vite build
npx vite build --config .artifacts/repro/auto-check.config.mjs
node .artifacts/repro/auto-check-runner.mjs      # expect exit 0
npx vite build --config .artifacts/repro/stage-round.config.mjs
node .artifacts/repro/stage-round-runner.mjs     # expect exit 0
```

Manual smoke (`npm start`, pick a playlist): tap the record to start the preview, tap a
wrong cover — it zooms, drops back, the music stops, green and red borders appear, and
after ~2.5s a fresh stage plays the next song. Tap a correct cover — the record slides in
as before.

## Phase 3 — Documentation and full regression sweep

**`.artifacts/repro/README.md`** — retitle the header to include #9, and add a section
for the rewritten `auto-check` check describing what it now proves. Update the "Round
length (issue #7)" paragraph, which says `stage-round` plays a round "by tapping covers
and swiping the record" — it only taps covers now.

The root `README.md` needs no change: it describes the round and scoring, never the
gesture.

**Verify — every harness, from a clean build:**

```bash
for check in stage-behaviour fallback reveal cover-leak cover-tap \
             round-state round-length score-timing stage-round auto-check; do
  npx vite build --config ".artifacts/repro/$check.config.mjs" >/dev/null || exit 1
  node ".artifacts/repro/$check-runner.mjs" || echo "FAILED: $check"
done
```

(`recycle-repro.mjs` is standalone: `node .artifacts/repro/recycle-repro.mjs`.)

## Risks

- **Styling `cover__correct` would leak the answer.** It is applied to the mystery cover
  from first render. The reveal deliberately uses separate classes; if a future change
  adds a rule for `cover__correct`, the answer becomes visible in devtools for the whole
  round. Caught by: inspecting the stage before answering — no cover should carry a
  border.
- **A stale red border on a fresh cover.** Mitigated by clearing `wrongTrack` before
  `reshuffleStage()` (finding 7). Caught by: the end-of-playlist fallback harness plus the
  auto-check assertion that no reveal class survives the reshuffle.
- **A tap landing during the reveal.** `isChecking()` stays true for the whole window and
  is the first guard in both `selectCover` and `checkAnswer`. Caught by: `stage-round`,
  which asserts exactly `ROUND_LENGTH` guesses across a full round.
- **A timer outliving the component.** `onCleanup(() => clearTimeout(revealTimer))` leaves
  the promise unresolved, so the chain stops rather than calling `navigate()` on a
  disposed stage. Caught by: harnesses call `dispose()` at the end and would surface a
  late throw.
- **The reveal feels wrong at 2.5s.** Pure taste, and a one-line change in `src/config.ts`.
- **Effect-flush assumption.** Finding 6 was derived from Solid's scheduling rather than
  measured. If the zoom still does not play, the fix is contained to
  `revealWrongAnswer` — widen the first `wait` or split the selection write into its own
  task.

## Assumptions

Design decisions taken during this pass, each with its reasoning:

1. **`cover__correct` stays.** Removing the marker would be the stricter fix, but
   `stage-round-repro.jsx` and `auto-check-repro.jsx` both identify the mystery cover
   through it in order to alternate deliberate hits and misses, and nothing else in the
   DOM identifies it. Picking covers blindly instead would make the round harness
   probabilistic (~6% chance of a round with no hit at all). The reveal gets its own
   classes so no style is ever attached to the marker. Tightening it is a follow-up, and
   the author's TODO stays as the reminder.
2. **The reveal lasts 2500ms**, after an 800ms hold that lets the zoom play — long enough
   to read both borders, short enough not to stall the round.
3. **The music resumes on the next question** (`play()` is kept). The issue asks for the
   music to stop, which the reveal window delivers; not resuming would also be
   inconsistent with `continousPlay`, which autoplays the next source on the correct path
   regardless.
4. **`pause()` now runs on both outcomes**, because that is what the record handler did
   before this change (`Stage.tsx:57-58`) — the correct path keeps its current feel.
5. **The record does not animate on a miss**, so `slideRecordOutside` is deleted rather
   than left orphaned. The issue gives the record no role in the new miss path.
6. **A selection is terminal** — deselect-by-tapping-again goes, since the tap now
   immediately resolves the guess.
7. **The record area keeps only a `Tap` recognizer.** Nothing is swiped on this screen any
   more and the surviving prompt already says "Tap to play".
8. **Reveal styling uses CSS modules** (the dominant convention in `src/components`), so
   harnesses match it with `[class*="reveal..."]` — the same substring approach they
   already use for `playerControls` and `scoreBoard__response`.
9. **Durations are stubbed in the harnesses** via a `config` alias rather than by faking
   timers, matching how `usePlaylist` and `animejs` are already swapped. Faking
   `setTimeout` globally would disturb Hammer's tap recognizer.
10. **One reveal signal, not two.** The green side reads the live mystery track, which is
    valid precisely because the reveal is cleared before the reshuffle.
11. **`checkRecord` is renamed `checkAnswer` and takes the answer as a parameter** — the
    record is no longer what triggers it, and passing the track avoids re-reading a signal
    written moments earlier.
12. **The three-phase split** keeps each phase independently verifiable: Phase 1 compiles
    and builds with no behaviour change, Phase 2 carries the behaviour change together
    with the harness updates that prove it (the harnesses cannot pass on either side of it
    alone), Phase 3 is documentation plus the full sweep.

## Open questions

None blocking. The three product questions raised at triage — reveal length, whether the
music resumes, and whether the record still animates on a miss — are resolved above as
assumptions 2, 3 and 5; each is a small, isolated change if the maintainer prefers
otherwise.
