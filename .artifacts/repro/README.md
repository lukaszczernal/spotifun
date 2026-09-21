# Headless checks (issues #3, #5)

Headless checks for the stage-reshuffle behaviour and the cover gesture
cleanup. The project has no test runner, so these are plain scripts.

Two of them drive the real `useTrackStore` with `usePlaylist` swapped for a
local stub, so they need to be bundled first: Solid's default Node resolution
picks the server build, where `createEffect` never runs and the stage stays
empty.

```bash
npm install            # project deps
npm install --no-save jsdom   # only needed by these checks
```

## Stage behaviour — the main regression guard

Asserts that a correct match replaces every cover, that guessed tracks never
come back, that the mystery track is always on the stage, and that the number
of playable rounds does not collapse.

```bash
npx vite build --config .artifacts/repro/stage-behaviour.config.mjs
node .artifacts/repro/stage-behaviour-runner.mjs
```

## End-of-playlist fallback

Runs a playlist of `STAGE_SIZE + 1` tracks, where there are not enough unseen
tracks left to build a whole new stage and the remaining covers have to be
reused in new positions.

```bash
npx vite build --config .artifacts/repro/fallback.config.mjs
node .artifacts/repro/fallback-runner.mjs
```

## Track pool arithmetic

Standalone model comparing the old replace-one behaviour, a naive reshuffle
that never releases `staged`, and the implemented version. Shows why the
outgoing covers have to be released back into the pool.

```bash
node .artifacts/repro/recycle-repro.mjs
```

## Cover reveal ordering

Confirms the existing reveal effect in `Stage.tsx` re-runs after `<For>` swaps
in the new covers, so a whole-stage replacement still fades in.

```bash
npx vite build --config .artifacts/repro/reveal.config.mjs
node .artifacts/repro/reveal-runner.mjs
```

## Cover gesture cleanup (issue #5)

Both scripts render the real `Cover` component and exit non-zero on
regression.

The leak check counts Hammer managers created against managers destroyed
across ten full-stage reshuffles, and compares the surviving `window`
listeners against the baseline after the initial render. Before the fix it
reported 44 created / 0 destroyed and 142 window listeners.

```bash
npx vite build --config .artifacts/repro/cover-leak.config.mjs
node .artifacts/repro/cover-leak-runner.mjs
```

The tap check is the counterpart: it proves the added `destroy()` only ever
fires on unmounted covers, by tapping every cover on every round and
asserting each one still registers, that no tap resolves to a track that has
left the stage, and that nothing responds after dispose.

```bash
npx vite build --config .artifacts/repro/cover-tap.config.mjs
node .artifacts/repro/cover-tap-runner.mjs
```
