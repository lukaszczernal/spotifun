# Issue #14 — Hold the record half way on a correct guess, then wait for a tap

Repo: `lukaszczernal/spotifun` · Branch: `factory/issue-14` · Base: `8c90142`

## Goal

When the player picks the **correct** cover, the stage stops rushing past the reveal. The
record waits half a second, slides half way into the cover and stops there. The song's
title and the performer's name appear with a "Tap to continue" prompt. Nothing else
happens until the player taps: the guess is not banked, the track is not retired, the
covers do not change. On the tap the prompt clears, the record finishes its slide, and the
stage advances exactly as it does today — including navigating to the score board if that
was the tenth guess.

Done means: `npx tsc --noEmit` reports no errors in `src/`, `npm run build` succeeds, and
all three Stage-driving harnesses pass — `correct-reveal` (the acceptance check for this
issue), `auto-check` (issue #9), and `stage-round` (issue #7) — with the rest of
`.artifacts/repro/` unchanged and still passing.

The wrong-answer path is **byte-for-byte unchanged**.

## Scope

**In**

- `src/Stage/animations.ts` — split `slideRecordInside` into a delayed half-travel leg and
  a finishing leg.
- `src/Stage/Stage.tsx` — gate the hit path's resolution on a player tap; render the
  prompt; branch the existing Hammer tap.
- `.artifacts/repro/correct-reveal-repro.jsx` + `correct-reveal-runner.mjs` — promote from
  "documents a missing behaviour" to a pass/fail acceptance check.
- `.artifacts/repro/auto-check-repro.jsx`, `.artifacts/repro/stage-round-repro.jsx` — add
  the continue tap so they keep driving a full round.
- `.artifacts/repro/README.md` — document the new check.

**Out**

- The wrong-answer path: `revealWrongAnswer`, `REVEAL_DURATION`, `wrongTrack`, the
  green/red cover borders. No tap gate on a miss (maintainer decision).
- `src/config.ts` and the two config stubs — the new delay lives in `animations.ts`
  alongside the other animation timings, so neither stub needs a new export.
- `useGame`, `useTrackStore`, `usePlayer`, `Cover`, `SplashText`, `PlayerControls` — all
  consumed as-is.
- The root `README.md` todo list. "Add stage result" is only satisfied for the correct
  path by this change; leave the box unticked.

## Verified understanding

Re-checked against the branch as it stands, not inherited on trust:

- `checkAnswer` (`src/Stage/Stage.tsx:167-218`) is the single resolution chain. The hit
  path is `slideRecordInside(recordRef).finished` (`:181-183`); everything after —
  `addScore`, `setWrongTrack()`, `markAsPlayed`, `reshuffleStage`, the round-over
  `navigate`, then `setSelected()` / `setIsChecking(false)` / `resetRecordPosition()` —
  hangs off that one promise (`:185-217`).
- `slideRecordInside` (`src/Stage/animations.ts:3-21`) is a three-leg `anime.timeline` with
  `easeOutExpo` and **no delay**: `-100%`/1400ms → `-125%`/1000ms → `100%`/1ms. The last
  leg is a snap-reset that parks the record below the viewport.
- `wait()` (`:50-56`) deliberately leaves its promise unresolved when the stage unmounts
  (`onCleanup` at `:84-89` clears the timer), so a disposed stage never reshuffles or
  navigates. **The tap gate must copy this.**
- The Hammer tap on `playerAreaRef` (`:65-73`) early-returns while `isChecking()`. That
  guard is the branch point.
- `.stage__recordAction` (`:267-271`) is the existing bottom prompt slot, gated on
  `playerState() === "pause" && stageTracks().length > 0 && !selected() && !isChecking()`.
  During the hold `isChecking()` is true and `selected()` is set, so "Tap to play" is
  already hidden — the two prompts cannot collide.
- `SplashText` takes `multiline?: string[]` and `subtitle?: string`
  (`src/components/SplashText/SplashText.tsx:4-7`).
- `Track` has `name` and `artist` (`src/services/model.ts:26-37`); `ScoreBoard` already
  renders that exact pair.
- **Correction to triage:** the triage note flagged a risk that `PlayerControls`' root
  `<a onClick={togglePlay}>` (`PlayerControls.tsx:34`) would double-fire with the continue
  tap. It cannot — `.playerControls__recordWrapper` sets `pointer-events: none`
  (`PlayerControls.module.css:14`), so that `onClick` is unreachable from a real pointer.
  The Hammer tap on `playerAreaRef` is the only live control. No defensive work needed.
- `npx tsc --noEmit` on the current branch reports errors only from `node_modules`
  (`@babel/core`, `workbox-core`). `src/` is clean. Filter with `| grep -v node_modules`.

## Design

**Two timelines, not one paused timeline.** anime v3 has no dependable "stop at the end of
leg N" hook — you would need `autoplay: false` plus a `complete` callback on the first
`.add()`, and every harness stub would have to model playback position. Two exported
functions each expose their own `finished` promise, which is exactly the shape the
resolution chain already consumes. Rejected alternative: a single timeline driven by
`.pause()` / `.play()`.

**The gate mirrors `wait()`.** A module-scoped resolver handle plus a signal, rather than
storing a resolver inside a signal (which would collide with Solid's updater-function
setter form). Dropping the handle on cleanup leaves the promise pending — the same
stop-the-chain semantics the reveal timer already relies on.

**One signal, not two.** `heldTrack` doubles as the gate indicator and the prompt's data
source. The gate is open exactly when `heldTrack()` is set. Rejected alternative: a
separate `awaitingContinue` boolean — two signals for one state.

**The prompt reads from the captured `askedTrack`, never from `mysteryTrack()`.**
`reshuffleStage()` swaps the mystery track synchronously; reading it live would risk
displaying the *next* question. This is the same constraint `score-timing-repro.jsx`
guards for the score.

**The whole tail moves behind the tap.** Scoring, retiring, reshuffling and navigating stay
in their current order and all run after the tap. Visible consequence: the score HUD
increments on continue, not on the pick. Rejected alternative: bank the score early and
gate only the reshuffle — two resolution points, and it breaks the ordering constraint
`44caf68` and `score-timing` both protect.

**Timings.** 500ms delay, then half travel (`-50%`) over 700ms. The finishing leg resumes
`-100%` over 700ms, then the existing `-125%`/1000ms overshoot and `100%`/1ms snap-reset.
Total motion is unchanged at 1400 + 1000 + 1. `easeOutExpo` on the half leg decelerates
into the hold, which reads as a deliberate stop.

## Phase 1 — Pin the target behaviour in the harnesses (expected: red)

Test-first. Write the acceptance checks before the implementation so Phase 2 has an
unambiguous signal.

### 1a. `.artifacts/repro/correct-reveal-repro.jsx`

Rewrite the assertion block (currently `:118-151`) into a full acceptance set. Keep the
mount, `gesture`, `settle`, `sleep` and `playerStub` helpers as they are. Import the delay
constant so the assertion tracks the source:

```js
import { RECORD_SLIDE_DELAY } from "../../src/Stage/animations";
```

The stub playlist (`usePlaylist.stub.ts`) names track *N* `track-N` / `artist-N` and gives
it cover `.../cover/N-big.jpg`, so the expected prompt text is derivable from the correct
cover's `img.src` before the tap:

```js
const askedId = correctCover().querySelector("img").src.match(/\/(\d+)-big\.jpg/)[1];
```

Assertions, in order:

1. the stage rendered a full set of covers *(existing)*
2. picking the correct cover builds a record slide timeline *(existing)*
3. the record slide starts with a half second delay —
   `(slide.params.delay ?? slide.steps[0].delay ?? 0) >= RECORD_SLIDE_DELAY`
4. the record stops half way into the cover — the first timeline's final step is a half
   travel (`-50%`), not the full `-100%`, and it has exactly one step
5. a "tap to continue" message is shown — `root.textContent.toLowerCase()` contains
   `"tap to continue"`
6. the prompt names the song and the performer — `root.textContent` contains
   `track-${askedId}` and `artist-${askedId}`
7. the guess is not banked until the player taps — `guessCount() === 0`
8. the covers do not change until the player taps — after `sleep(30)`, `coverIds()` equals
   the pre-pick snapshot

Then tap the player area and assert the other half:

```js
const playerArea = root.querySelector('[class*="playerControls"]');
const timelinesBefore = timelines.length;
gesture(playerArea);
await settle();
await sleep(30);
await settle();
```

9. tapping continues the record slide — `timelines.length > timelinesBefore`, and the new
   timeline ends on the `100%` snap-reset
10. the guess is banked on the tap — `guessCount() === 1`
11. the prompt is cleared — no `"tap to continue"` in `root.textContent`
12. the stage moved on — `coverIds()` differs from the snapshot and still has
    `STAGE_SIZE` entries

Update the trailing summary strings: pass means issue #14 behaviour is implemented.

### 1b. `.artifacts/repro/correct-reveal-runner.mjs`

Replace the always-zero exit (`:22-24`) with `process.exit(failures ? 1 : 0)` and drop the
"a non-zero failure count is the expected result today" comment — it is an acceptance
check now, not a reproduction.

### 1c. `.artifacts/repro/auto-check-repro.jsx`

Step 4 (`:174-184`) picks the correct cover and asserts `guessCount() === 2`. Add the
continue tap between the pick and the assertion:

```js
gesture(correctCover(), "tap");
await settle();
// A correct pick now holds for a confirming tap (issue #14).
gesture(root.querySelector('[class*="playerControls"]'), "tap");
await settle();
await sleep();
await settle();
```

Leave step 3 ("tapping the record area does not record a guess") alone — no gate is open at
that point, so it still proves the record area resolves nothing on its own.

### 1d. `.artifacts/repro/stage-round-repro.jsx`

In `answer({ correctly })` (`:102-116`), after the cover tap and its `settle()`, tap the
player area when `correctly` is true:

```js
gesture(target, "tap");
await settle();
if (correctly) {
  // A hit waits for a confirming tap before the stage advances (issue #14).
  gesture(root.querySelector('[class*="playerControls"]'), "tap");
  await settle();
}
await sleep();
await settle();
```

`.artifacts/repro/stage-round.stub-anime.js` needs **no change** — the implementation only
ever reads `.finished` and chains `.add()`, both of which the stub already provides.

### Verify Phase 1

```bash
npx vite build --config .artifacts/repro/correct-reveal.config.mjs
node .artifacts/repro/correct-reveal-runner.mjs   # expect FAILs on checks 3-12, exit 1

npx vite build --config .artifacts/repro/auto-check.config.mjs
node .artifacts/repro/auto-check-runner.mjs       # expect ALL CHECKS PASSED

npx vite build --config .artifacts/repro/stage-round.config.mjs
node .artifacts/repro/stage-round-runner.mjs      # expect ALL CHECKS PASSED
```

The added continue taps are **no-ops against today's code** — the Hammer handler
early-returns while `isChecking()`, and once the stage has advanced a stray tap only
toggles a stubbed player. So auto-check and stage-round stay green across both phases;
only `correct-reveal` flips red→green. If either of them goes red here, the tap is landing
somewhere unintended — fix the selector before going on.

## Phase 2 — Implement

### 2a. `src/Stage/animations.ts`

Replace `slideRecordInside` with the delay constant and two functions:

```ts
import anime from "animejs";

/** Beat between picking the right cover and the record starting to move. */
export const RECORD_SLIDE_DELAY = 500;

/**
 * First half of the record slide: it comes to rest half hidden behind the
 * cover and stays there, so the answer can be read before the stage moves on.
 */
export const slideRecordHalfway = (recordRef: HTMLDivElement) =>
  anime
    .timeline({ targets: recordRef, easing: "easeOutExpo" })
    .add({
      translateY: "-50%",
      duration: 700,
      delay: RECORD_SLIDE_DELAY,
    });

/**
 * The rest of the slide, run once the player taps to continue. The last leg is
 * a snap-reset that parks the record below the viewport for the next question.
 */
export const slideRecordHome = (recordRef: HTMLDivElement) =>
  anime
    .timeline({ targets: recordRef, easing: "easeOutExpo" })
    .add({ translateY: "-100%", duration: 700 })
    .add({ translateY: "-125%", duration: 1000 })
    .add({ translateY: "100%", duration: 1 });
```

### 2b. `src/Stage/Stage.tsx`

**Import** (`:27`): `import { slideRecordHalfway, slideRecordHome } from "./animations";`

**State** — add next to the other signals (`:36-38`):

```ts
// Set while a correct answer is held on screen waiting for the player to tap
// on. Doubles as the gate: the chain is parked exactly when this is set.
const [heldTrack, setHeldTrack] = createSignal<Track>();
```

**Gate** — next to `wait()` (`:50-56`), same shape and same reasoning:

```ts
let continueResolver: (() => void) | undefined;

// Like wait(), but released by the player instead of a timer. Dropping the
// resolver on unmount leaves the promise unresolved, which stops the
// resolution chain rather than letting it reshuffle or navigate on a disposed
// stage.
const waitForContinue = (track: Track) =>
  new Promise<void>((resolve) => {
    continueResolver = resolve;
    setHeldTrack(track);
  });

const continueStage = () => {
  const resolve = continueResolver;
  continueResolver = undefined;
  setHeldTrack();
  resolve?.();
};
```

**Hammer branch** (`:68-73`):

```ts
hammerRecord.on("tap", () => {
  if (heldTrack()) {
    continueStage();
    return;
  }
  if (isChecking()) {
    return;
  }
  togglePlayer();
});
```

**Cleanup** (`:84-89`) — add `continueResolver = undefined;` beside the `clearTimeout`.

**The chain** (`:167-183`). Capture `recordRef` into a const first: the early
`if (!recordRef)` guard does not narrow the `let` inside the later closures.

```ts
const record = recordRef;

const presented = correct
  ? slideRecordHalfway(record)
      .finished.then(() => waitForContinue(answeredTrack))
      .then(() => slideRecordHome(record).finished)
  : revealWrongAnswer(answeredTrack);
```

`answeredTrack` and the captured `askedTrack` are the same object on a hit; pass
`answeredTrack` because it is non-optional, which keeps the signal's type `Track`.

Everything from `presented.then(...)` down (`:185-217`) is **untouched**.

**The prompt** — inside `.stage__playerControls`, immediately before the existing
`<Show>` block (`:259`):

```tsx
<Show when={heldTrack()}>
  <div className={styles.stage__recordAction}>
    <Animate type={AnimationType.fadeIn}>
      <SplashText
        multiline={[heldTrack()!.name, heldTrack()!.artist]}
        subtitle="Tap to continue"
      />
    </Animate>
  </div>
</Show>
```

Non-null assertion rather than `<Show>`'s callback form: on solid-js 1.3 that callback
receives the raw value, not an accessor, and the explicit read is unambiguous.

### Verify Phase 2

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules     # expect no output

npx vite build --config .artifacts/repro/correct-reveal.config.mjs
node .artifacts/repro/correct-reveal-runner.mjs   # expect ALL CHECKS PASSED, exit 0

npx vite build --config .artifacts/repro/auto-check.config.mjs
node .artifacts/repro/auto-check-runner.mjs       # expect ALL CHECKS PASSED

npx vite build --config .artifacts/repro/stage-round.config.mjs
node .artifacts/repro/stage-round-runner.mjs      # expect ALL CHECKS PASSED
```

Regression sweep over the harnesses this change does not touch — all must stay green:

```bash
for check in stage-behaviour fallback reveal cover-leak cover-tap \
             round-state round-length score-timing game-list; do
  npx vite build --config ".artifacts/repro/$check.config.mjs" \
    && node ".artifacts/repro/$check-runner.mjs"
done
node .artifacts/repro/recycle-repro.mjs

npm run build
```

Manual check with `npm run dev`: pick the right cover → the record pauses ~0.5s, slides
half way behind the zoomed cover and stops; the title, artist and "Tap to continue" fade in
above it; the score HUD has not moved and the covers have not changed; tapping the record
area finishes the slide and deals a new stage. Pick a wrong cover → unchanged, the reveal
borders still time out on their own.

## Phase 3 — Document

Add a section to `.artifacts/repro/README.md` after the issue #9 block:

```markdown
## Correct-answer hold (issue #14)

`correct-reveal` guards the pacing of a right answer: the record slide starts
half a second late, stops half way into the cover, and the stage holds there
showing the song title, the performer and a "Tap to continue" prompt. It asserts
nothing advances until the player taps — no guess banked, no covers swapped —
and that the tap finishes the slide and deals the next stage.

A wrong answer is deliberately not gated this way; it still times out on
REVEAL_DURATION, which `auto-check` covers.

npx vite build --config .artifacts/repro/correct-reveal.config.mjs
node .artifacts/repro/correct-reveal-runner.mjs
```

Update the heading on line 1 to include #14, and amend the `auto-check` and `stage-round`
paragraphs to note that a correct pick now needs a confirming tap.

## Risks

| Risk | Catch it by |
| --- | --- |
| `recordRef` is a `let`; TS will not narrow it inside the `.then` closures | `npx tsc --noEmit` — the `const record` capture is the fix |
| The continue tap also toggles playback, restarting the preview mid-hold | `heldTrack()` is checked *before* `isChecking()` and returns early. `pointer-events: none` on the record wrapper already rules out the `<a onClick>` path. Confirm by ear in `npm run dev` |
| A stage disposed mid-hold leaves a pending promise | Intended — same as `wait()`. `stage-round` disposes at the end of a round; watch for stray navigation or console errors after dispose |
| The tenth correct guess strands the player if they never tap | By design, no auto-advance. `stage-round` taps, so it still reaches `/game/score` — if it does not, the gate is not releasing |
| `.stage__recordAction` is `position: absolute; bottom: 26vh`, above the record rather than at the screen edge | Accepted — it is the established prompt slot. Check it does not collide with the half-slid record on a short viewport |
| Both prompts render at once | Cannot happen: the "Tap to play" `<Show>` requires `!isChecking() && !selected()`, both false during the hold. Harness check 11 asserts the continue prompt clears |
| `easeOutExpo` restarting from rest makes the second leg look abrupt | Visual only; judge in `npm run dev` and retune the 700ms if needed |

## Assumptions

1. **Feature request, not a defect.** The "current state" in the issue is the behaviour
   deliberately shipped in `44caf68` (issue #9 / PR #11). Nothing is malfunctioning.
2. **"Half slid in the cover" is `-50%`** — half of the original first leg's travel. The
   `-125%` overshoot and the `100%` snap-reset belong to the post-tap finish.
3. **The 500ms delay is measured from the pick** and applies to the record slide only. The
   cover zoom and the preview pause stay immediate.
4. **1400ms splits 700/700.** Total motion is preserved; only the delay and the hold are
   added.
5. **The continue tap is taken on the existing `playerAreaRef`**, not a new full-screen
   target. Reusing the wired-up handler keeps the record area the single interactive
   surface that #9 established.
6. **The whole tail of the chain moves behind the tap**, so the score HUD increments on
   continue rather than on the pick.
7. **No auto-advance fallback.** Input is already locked by `isChecking()`, so a stalled
   stage is not reachable by accident, and a timeout would reintroduce the pacing this
   removes.
8. **The preview stays paused through the hold**, as today.
9. **The tenth correct guess navigates to the score board on the tap.**
10. **The delay constant lives in `animations.ts`, not `config.ts`.** `config.ts` holds
    values `Stage` *waits on*; this one is internal to the timeline. Keeping it in the
    animation module also spares both config stubs a new export.
11. **`heldTrack` carries the answered track, not a boolean**, so the prompt and the gate
    cannot drift apart.
12. **Triage's double-tap risk is void** — `pointer-events: none` makes the
    `PlayerControls` `<a onClick>` unreachable. No defensive change.
13. **The root `README.md` todo stays unticked** — "Add stage result" is only satisfied for
    the correct path.

## Open questions

None. Both questions raised at triage were answered by the maintainer and are recorded
under Scope: the hold shows the song title and the performer's name, and the wrong-answer
path keeps its `REVEAL_DURATION` timer with no tap gate.
