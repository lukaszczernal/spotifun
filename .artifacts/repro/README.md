# Headless checks (issues #3, #5, #7, #9, #10, #13, #14, #15, #19)

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

## Repeated album covers (issue #13)

A cover belongs to an album, not to a track, so two tracks of one album put the
same image on the stage twice - and when one of them is the mystery track the
guess cannot be answered. The stub builds playlists where a configurable number
of tracks share an album, as Deezer playlists do, and plays 2000 stages per
configuration.

Before the fix: 0% repeated covers with one track per album, 17% with two and
29% with three, about half of them unanswerable. After it all three
configurations report zero.

A fourth case covers this rule together with the progress weighting of issue
#15, since both reorder the same pool: a playlist of 40 tracks, 3 per album,
half of it already guessed, where the unguessed songs alone cannot fill a stage
from distinct albums. Covers stay distinct and no song already guessed is asked
about again. Ignoring progress in `isGuessed` turns the second assertion to 53%
repeats, so the case is not vacuous.

```bash
npx vite build --config .artifacts/repro/dup-cover.config.mjs
node .artifacts/repro/dup-cover-runner.mjs
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

## Round length (issue #7)

Four checks, each exiting non-zero on regression.

`stage-round` is the main guard: it mounts the real `Stage` and `ScoreBoard`
behind the real routes and plays a whole round by tapping covers, alternating
hits and misses. It asserts the round ends after
exactly `ROUND_LENGTH` guesses, that a miss consumes a guess and moves on to a
new song, that the player lands on the score board, and that misses are listed
there. Animations are stubbed, otherwise a round takes ~20s of wall clock time.

It doubles as the end-to-end guard for issue #15: the round is played against
the real progress store, and the checks confirm only the songs the player got
right counted towards the playlist, measured against the whole playlist.

```bash
npx vite build --config .artifacts/repro/stage-round.config.mjs
node .artifacts/repro/stage-round-runner.mjs
```

The remaining three cover the stores beneath it: `round-state` on the round
counter in `useGame` (including a late answer arriving after the round is
over), `round-length` on a full session against the stores — a perfect round, a
round of pure misses, and a playlist too short to finish — and `score-timing`
on the ordering constraint that a score records the song the player was asked
about, not the one the stage moves on to.

```bash
for check in round-state round-length score-timing; do
  npx vite build --config ".artifacts/repro/$check.config.mjs"
  node ".artifacts/repro/$check-runner.mjs"
done
```

## Game list (issue #10)

Renders the real `GameList` behind a router and reads back the tiles a player
would see. Asserts the menu offers all three playlists — "Your favourites",
"00's Jazz" and "2010" — each linking to its own `/game/:playlistId`, with no
playlist dropped and none listed twice, and every tile carrying a cover whose
alt text matches its title.

The tile count and duplicate checks are the regression guard: the #7 PR series
shipped a duplicated tile that needed a follow-up commit to remove.

The progress store is seeded first (issue #15), so the same run also asserts
every tile reports the share of its playlist guessed — including a playlist
that has never been opened, which reads 0% — and that only a finished playlist
carries the badge.

```bash
npx vite build --config .artifacts/repro/game-list.config.mjs
node .artifacts/repro/game-list-runner.mjs
```

## Automatic answer check (issue #9)

`auto-check` guards the flow change: selecting a cover resolves the guess on
its own, with no second gesture. Against the real `Stage`, it asserts that a
wrong pick records the guess and pauses the preview, that during the reveal
exactly one cover carries the red border (the one picked) and one the green
(the answer), that the reveal is cleared before the stage moves on so no stale
border lands on a recycled cover, that the record area no longer resolves
anything, and that a correct pick resolves on the tap with no borders shown.

The reveal delays come from `config.stub-reveal.ts`, shortened but non-zero so
the reveal window can be sampled while it is open. `stage-round` uses
`config.stub.ts`, which collapses them to zero.

```bash
npx vite build --config .artifacts/repro/auto-check.config.mjs
node .artifacts/repro/auto-check-runner.mjs
```

## Swipe up to continue on a correct answer (issues #14, #19)

`correct-reveal` guards the hold a right answer gets. Against the real `Stage`,
it asserts that the pick interrupts nothing — the record does not move and the
song is not paused — while the song title, the performer and a "swipe up to
continue" prompt are shown, and that nothing is committed during the hold: no
guess banked, no covers swapped. It then continues and asserts that the music
stops, the whole record slide runs, the guess is banked, the prompt clears and
a fresh stage is dealt.

The whole sequence runs twice, released by a swipe once and a tap once, which
must agree. The swipe travels through intermediate `pointermove` events: a
`pointerdown`/`pointerup` pair that merely shares a distant coordinate has no
delta and is recognised as a tap, which would let the harness pass even with
the swipe recognizer removed.

Issue #19 inverted most of these assertions. The record used to slide half way
into the cover half a second after the pick and the music used to stop there;
it now stays where it was playing, spinning, until the player continues.

The wrong-answer path is deliberately left on its timer, so the asymmetry is
covered by `auto-check` rather than here.

Unlike the other Stage harnesses, this one aliases `animejs` to
`correct-reveal.stub-anime.js`, which records the timelines instead of driving
them off rAF. That is what makes "the record did not move at all" provable; a
stub that resolved instantly could not tell that from a slide that ran.

```bash
npx vite build --config .artifacts/repro/correct-reveal.config.mjs
node .artifacts/repro/correct-reveal-runner.mjs
```

## Playlist completion (issue #15)

`progress` is the main guard for finishing a playlist. It drives the real
progress store together with the real track store, recording a correct guess
per answer the way `Stage` does, and asserts the share guessed is measured
against the playable track count; that a playlist is finished both by a
faultless round and by guessing more than 80% of it over several rounds; that
the 80% mark is strict, so 32 of 40 is not enough and 33 is; that a finished
playlist stays finished when it later grows, with its share recalculated
against the new count; and that replaying a playlist never asks again about a
song already guessed right.

```bash
npx vite build --config .artifacts/repro/progress.config.mjs
node .artifacts/repro/progress-runner.mjs
```

`replay-route` guards the way back in, without which progress cannot
accumulate at all: the score board's "One more round" button used to point at
`/game`, dropping the player on the splash screen and losing the playlist they
were playing. It renders the real `ScoreBoard` and resolves its button through
the real route table, asserting the player lands back on the stage for the same
playlist, and on the menu when no playlist is known.

```bash
npx vite build --config .artifacts/repro/replay-route.config.mjs
node .artifacts/repro/replay-route-runner.mjs
```
