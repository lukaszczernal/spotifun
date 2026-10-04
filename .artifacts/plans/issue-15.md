# Issue #15 — per-playlist game completion

Plan for: "The goal of each game is to correctly match all the covers with the song/record"
Branch: `factory/issue-15` (base commit `8c90142`)

## Goal

A player can see how far through each playlist they are, and a playlist can be
finished. Progress is tracked per playlist for the lifetime of the app session:
the set of songs guessed correctly, a completeness percentage computed against
the playable (preview-bearing) track count, and a sticky `completed` flag earned
at **more than 80%** guessed or at a **10/10 round**. The game list shows a
percentage on every tile and a badge on completed ones; the stage HUD shows the
percentage for the playlist being played. When the stage draws a new question it
prefers a song the player has not guessed yet.

Done means: the five checks in Phase 6 pass, `npm run build` succeeds, and a
manual session on `/game/9010236822` shows the stage percentage climbing as
songs are guessed, the game list reflecting it after navigating back, and a
badge appearing once the threshold is crossed.

## Scope

**In**
- New app-level, session-scoped progress store keyed by playlist id.
- Recording correct guesses from `Stage.checkAnswer`.
- Percentage recalculation when a player enters a playlist.
- Completion rules (>80%, or 10/10 in a round), with a permanent flag.
- Unguessed-first preference when choosing the mystery track.
- Percentage + badge on the game list tiles; percentage in the stage HUD.
- Repairing the scoreboard "One more round" route, which currently drops the
  player out of the playlist (see Risks — this blocks the feature's core loop).

**Out**
- Persistence across reloads. Explicitly deferred by the maintainer to a
  separate story; the store is wiped on refresh by design.
- Any change to round mechanics, animations, or the correct-guess resolution
  chain (that is issue #14, which touches the same `checkAnswer` body).
- Prefetching playable track counts for playlists not yet entered (see
  Assumptions — tiles read 0% until first entry).
- Resetting progress on demand.

## Verified understanding

Re-checked against `8c90142`, not inherited on trust:

- `src/services/useGame.tsx:19-44` — `answers: Score[]`, derived `guessCount`,
  `scoreCount`, `failsCount`, `isRoundOver`. `getStore()` returns the
  `[readers, actions]` tuple; `GameProvider` wraps it.
- `src/Stage/Stage.tsx:80-82` — `onMount` calls `gameAction.resetGame()`, so the
  round store cannot hold cross-round progress.
- `src/index.tsx:12-18` — `GameProvider` and `PlayerProvider` sit inside
  `Router`, above `<App/>`. A sibling provider there survives every navigation
  and dies on reload: exactly the required session scope, with no storage API.
- `src/services/usePlaylist.ts:43` — `.filter((track) => track.preview)`. The
  resolved array length **is** the playable count, already exposed as
  `trackCount` by `useTrackStore.ts:37` (`createMemo(() => playlist()?.length)`).
  `Stage.tsx:42-43` does not currently destructure it.
- `src/services/useTrackStore.ts:60-64` — `drawTracks` takes
  `freeTracks().slice(0, count)`; `:49` and `:103` set the mystery index with
  `getRandomInt(STAGE_SIZE)` over the drawn stage.
- `src/Stage/Stage.tsx:186-190` — the single `addScore` call, reached by both
  the correct and the wrong path, with `correct` and `askedTrack` in scope.
- `src/GameList/GameList.tsx:23-42` — a hard-coded array of
  `{ id, title, imageUrl }`, rendered through a local `Tile`. No data source.
- `src/ScoreBoard/ScoreBoard.tsx:49-51` — `<Button href="/game">`. Confirmed by
  running `.artifacts/repro/replay-route-runner.mjs`: `/game -> splash`.

Two corrections to the triage understanding:

1. **`tsc --noEmit` is not a clean gate.** It reports ~40 pre-existing errors
   from `node_modules` (`workbox-core` needs DOM-worker libs, `@babel/core` has
   no types). Filter them: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v node_modules`
   must be empty. There is no lint or test script in `package.json`.
2. **`game-list-runner.mjs` already fails on `main`.** It expects 2 tiles and
   finds 3 — the "2010" tile was added after the harness was written. It is a
   stale expectation, not a regression, and must be corrected in Phase 5 before
   it can guard anything.

## Design

**A separate provider, not an extension of `useGame`.** `useGame` is the round
store and is reset on every stage mount; progress outlives rounds. A sibling
`ProgressProvider` in `index.tsx` follows the established shape of both existing
services (`createContext` + `Provider` + `getStore`).
*Rejected:* adding fields to `useGame` — `resetGame()` would have to learn which
fields to spare, and every harness driving `getStore()` would inherit progress
semantics it does not want.

**The store holds ids, percent and flag.** The maintainer asked for the
percentage to be stored (spec item 5). The percentage alone cannot be
recalculated against a new denominator, and the weighting needs song identity,
so each entry keeps `guessed: number[]`, `percent: number`, `completed: boolean`.
*Rejected:* storing only the percentage — makes item 1's recalculation and the
unguessed-first draw impossible.

**Progress is injected into `useTrackStore`, not read from context.** The
weighting needs the guessed set inside `drawTracks`. `useTrackStore` is driven
directly by three harnesses (`round-length`, `score-timing`, `stage-behaviour`)
under bare `createRoot` with no providers; a `useContext` call there would
return `undefined` and break them.
*Chosen:* an optional `guessedIds?: () => number[]` prop, defaulting to `() => []`.
*Rejected:* `useContext(ProgressContext)` inside the store — breaks three
harnesses and couples the draw to the app tree.

**Mystery-track preference is the real weighting.** `drawTracks` picks the four
covers; `mysteryIndex` picks which of them is asked about. Ordering `freeTracks`
alone would not guarantee the *asked* song is unguessed. Both are needed:
unguessed-first ordering in `drawTracks`, and an unguessed-preferring index
choice, each falling back to the current random behaviour when every candidate
is guessed.
*Rejected:* filtering guessed tracks out of the pool — the stage would stop
advancing once a playlist is mostly complete.

**The replayed playlist id lives in `useGame`.** "Which playlist is this round"
is round state, and `ScoreBoard` already consumes `GameContext`.
*Rejected:* a route param on `/game/score` — changes the route table and every
`navigate("/game/score")` call site for no gain.

## Phases

### Phase 1 — the progress store

**Create `src/services/useProgress.tsx`.** Mirror `useGame.tsx` exactly:
`createContext`, a `ProgressProvider` component, and an exported `getStore()`
so harnesses can drive it without a provider.

```ts
export interface PlaylistProgress {
  guessed: number[];      // distinct correctly-guessed track ids
  percent: number;        // 0-100, recomputed on entry and on each guess
  completed: boolean;     // sticky once earned
  playableCount: number;  // denominator observed at last entry; 0 = unknown
}
```

Store: `createStore<Record<string, PlaylistProgress>>({})`.

Readers:
- `progressOf(playlistId: string): PlaylistProgress` — returns a frozen empty
  default (`{ guessed: [], percent: 0, completed: false, playableCount: 0 }`)
  for unknown ids, so callers never branch on existence.
- `guessedIds(playlistId: string): number[]`.

Actions:
- `syncPlaylist(playlistId, playableCount)` — creates the entry if absent,
  records the denominator, recomputes `percent`. **Must not** clear `guessed` or
  `completed`. This is spec item 5.
- `recordGuess(playlistId, trackId)` — adds the id if absent, recomputes
  `percent`, and sets `completed` when the threshold is crossed. A no-op for a
  duplicate id, so replaying a song never double-counts.
- `completeRound(playlistId, correctCount)` — sets `completed` when
  `correctCount >= ROUND_LENGTH`.

Rules, in one place:
- `percent = playableCount > 0 ? Math.round((guessed ∩ playable).length / playableCount * 100) : 0`.
  Since the store does not hold the playable id list, use
  `Math.min(guessed.length, playableCount)` as the numerator — it clamps the
  case where the playable set shrank between entries and keeps `percent <= 100`.
- `completed` is set when `percent > 80`, and is **never cleared** — once true,
  `syncPlaylist` and `recordGuess` leave it alone even if `percent` drops.

Export `ProgressContext`, `ProgressProvider`, `getStore`, and a `useProgress()`
helper returning `useContext(ProgressContext)!`, matching `usePlayer`'s shape.

**Mount it in `src/index.tsx`**, inside `Router`, wrapping `GameProvider`.

### Phase 2 — record progress from the stage

In `src/Stage/Stage.tsx`:

- Destructure `trackCount` from the existing `useTrackStore({...})` call
  (`:42-43`) — it is already returned, just unused.
- Pull the progress actions and the reader for `params.playlistId`.
- Add a `createEffect` that calls `syncPlaylist(params.playlistId, trackCount())`
  once `trackCount()` is defined. This is the "recalculate on entry" step.
- In `checkAnswer`'s `.then()` (`:186-190`), immediately after the existing
  `gameAction.addScore({...})`, add:
  ```ts
  if (correct && askedTrack) {
    progressAction.recordGuess(params.playlistId, askedTrack.id);
  }
  ```
  `correct` and `askedTrack` are already computed at `:178-179`. Do not restructure
  the surrounding promise chain — issue #14 rewrites it.
- Where the round ends (`if (isRoundOver() || !advanced)` at `:202`), call
  `progressAction.completeRound(params.playlistId, scoreCount())` before
  `navigate("/game/score")`. `scoreCount()` is already destructured at `:38` and
  reflects the guess just recorded, because `addScore` ran earlier in the chain.
- Record the playlist for the scoreboard: `gameAction.setPlaylistId(params.playlistId)`
  in the existing `onMount` (`:80-82`), alongside `resetGame()`.
- HUD (`:225-232`): add a line to the existing `.stage__score` block,
  `<br /> Complete: {progress().percent}%`. No CSS change — the block is
  absolutely positioned and free-flowing.

In `src/services/useGame.tsx`: add a `playlistId` signal with a `setPlaylistId`
action, exposed through the existing tuple. `resetGame()` must not clear it —
it is set in the same `onMount` and the scoreboard reads it afterwards.

### Phase 3 — prefer unguessed songs when drawing

In `src/services/useTrackStore.ts`:

- Extend `TrackStoreProps` with `guessedIds?: () => number[]`; default to
  `() => []` in the destructure so every existing caller and harness is
  unaffected.
- In `drawTracks` (`:60-64`), partition `freeTracks()` into unguessed and
  guessed, and slice from `[...unguessed, ...guessed]`. Keep the existing
  `setStaged(item, true)` loop.
- Add a `pickMysteryIndex(stage: TrackStageItem[]): number` helper: collect the
  indices of unguessed tracks on the stage, return a random one of those, or
  `getRandomInt(STAGE_SIZE)` when there are none. Use it at both
  `setMysteryIndex` call sites (`:49` in the initial-stage effect, `:103` in
  `reshuffleStage`).

Pass `guessedIds: () => progress().guessed` from `Stage.tsx`'s `useTrackStore` call.

### Phase 4 — game list tiles

In `src/GameList/GameList.tsx`:

- Read the progress store, and give `Tile` the `percent` and `completed` it needs.
- `Tile` renders the percentage under the title and, when `completed`, a badge
  over the cover.
- Note `Tile` is a plain function taking destructured props, so reactivity is
  lost on destructure. Pass accessors (`percent: () => number`) or read
  `progressOf(id)` inside the tile body — do not destructure a plain value, or
  the tile will freeze at its first render.

In `src/GameList/GameList.module.css`: add `.tileBadge` (absolute, top-right
over `.tileImage`; `.tile` is already `position: relative`) and `.tilePercent`
(inside `.tileContent`, muted, smaller than `.tileTitle`).

### Phase 5 — repair the replay route

In `src/ScoreBoard/ScoreBoard.tsx:49-51`: read `playlistId` from `GameContext`
and link to `/game/${playlistId()}`, falling back to `/gamelist` when it is
unset (direct navigation to `/game/score`). Keep the "One more round" label.

### Phase 6 — checks

All harnesses live in `.artifacts/repro/` and follow the existing
bundle-then-run convention; there is no test runner.

**New: `progress-repro.jsx` + `progress.config.mjs` + `progress-runner.mjs`.**
Model `round-length.config.mjs` (it aliases `/^\.\/usePlaylist$/` to the stub —
needed here too, since this drives the real `useTrackStore`). Drive the real
`getStore()` from `useProgress` under `createRoot` and assert:
- a playlist never entered reads 0% / not completed;
- `syncPlaylist(id, 40)` then 20 distinct `recordGuess` calls → 50%, not completed;
- crossing to 33/40 (82.5%) → completed; **32/40 (80%) must not complete** —
  the boundary case for the strict `>` rule;
- a duplicate `recordGuess` does not move the percentage;
- `completeRound(id, ROUND_LENGTH)` completes a playlist sitting at any percentage;
- `completed` survives `syncPlaylist(id, 400)` dropping the percentage — the
  permanence rule;
- with `guessedIds` supplied, the mystery track is unguessed for as long as
  unguessed tracks remain in the pool, and the stage still advances once they
  are exhausted (drive `useTrackStore` + `reshuffleStage` as `round-length-repro`
  does).

**Update `game-list-repro.jsx` / `game-list-runner.mjs`.** Correct the stale
2-tile expectation to the three shipped playlists (see Verified understanding),
then read back the new affordances: every tile exposes a percentage, and a
completed playlist carries a badge. Render inside `ProgressProvider` with a
seeded entry so both states are covered. Select on `a`/`img`/`h3` as the harness
already does — CSS module class names are hashed at build time.

**Update `.artifacts/repro/README.md`** with an "Issue #15" section.

Commands:

```bash
npx vite build --config .artifacts/repro/progress.config.mjs
node .artifacts/repro/progress-runner.mjs

npx vite build --config .artifacts/repro/game-list.config.mjs
node .artifacts/repro/game-list-runner.mjs

# regression guards for the chain this change writes into
npx vite build --config .artifacts/repro/stage-round.config.mjs
node .artifacts/repro/stage-round-runner.mjs
npx vite build --config .artifacts/repro/round-length.config.mjs
node .artifacts/repro/round-length-runner.mjs
npx vite build --config .artifacts/repro/score-timing.config.mjs
node .artifacts/repro/score-timing-runner.mjs

npx vite build --config .artifacts/repro/replay-route.config.mjs
node .artifacts/repro/replay-route-runner.mjs   # informational: prints route map

npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v node_modules   # must print nothing
npm run build
```

`jsdom` is a harness-only dependency: `npm install --no-save jsdom`.

## Risks

- **`markAsPlayed` retires every asked song, right or wrong.** A song guessed
  wrongly is removed from the session pool, so it cannot be re-asked until the
  pool is exhausted. The unguessed-first weighting therefore has less to work
  with than it appears. Check: the `progress-repro` assertion that the stage
  still advances once unguessed tracks run out.
- **Reactivity loss in `GameList`.** `Tile` destructures its props; a plain
  `percent` value will never update. Catch: navigate stage → game list → stage
  and confirm the tile percentage changes.
- **`scoreCount()` timing at round end.** `completeRound` must read the score
  *after* `addScore` has run for the final guess. `score-timing-runner.mjs`
  guards the surrounding ordering constraint; run it.
- **Conflict with issue #14.** It rewrites the same `checkAnswer` resolution
  chain. Keep the edit to two inserted statements so a rebase is mechanical.
- **`syncPlaylist` firing repeatedly.** `trackCount()` is a memo over a resource;
  the effect re-runs on refetch. It must be idempotent and must never clear
  `guessed` or `completed` — asserted in `progress-repro`.
- **`percent` can exceed reality if the playable set shrinks.** Mitigated by the
  `Math.min` clamp; the numerator is a count, not a true intersection, because
  the store does not keep the playable id list.

## Assumptions

Design decisions taken during this pass, all resolvable from code or the
maintainer's specification:

1. **">80%" is strict**, per the issue's wording ("more than 80%"). 32/40 does
   not complete; 33/40 does. Asserted explicitly as a boundary case.
2. **"Guessed" means guessed correctly** — a wrong answer does not advance the
   percentage.
3. **Completion rules are an OR**, as written: >80% *or* a 10/10 round.
4. **The 10/10 check reads `scoreCount()` at round end** rather than adding a
   counter, reusing the existing round store.
5. **Distinct songs only** — `recordGuess` is idempotent per track id.
6. **The store keeps `guessed` ids as well as the percentage**, because item 5's
   recalculation and the unguessed-first draw both need identity.
7. **The percentage numerator is clamped** (`min(guessed.length, playableCount)`)
   rather than a true intersection against the playable id list, which the store
   does not hold.
8. **Tiles show 0% for a playlist not entered this session**, with no badge. The
   denominator only exists after the Deezer fetch, which happens in `Stage`;
   `GameList` has no data source. Flagged to the maintainer in triage and not
   contested.
9. **Progress is injected into `useTrackStore` as a prop**, not read from
   context, to keep three existing harnesses working.
10. **Weighting applies to the mystery track**, not the decoy covers, and is a
    preference rather than a filter.
11. **The replayed playlist id lives in `useGame`**, set in `Stage.onMount` and
    survives `resetGame()`.
12. **The scoreboard falls back to `/gamelist`** when no playlist id is set.
13. **The stage HUD gains a line in the existing `.stage__score` block**, no new
    layout.
14. **`tsc --noEmit` is read with `node_modules` filtered out** — the pre-existing
    errors there are unrelated to this change.
15. **The stale 2-tile expectation in `game-list-runner.mjs` is corrected to 3**,
    since the harness is being extended and currently fails on `main`.

## Open questions

None blocking. The two raised at triage were both settled by the maintainer:
the denominator is the playable (preview-bearing) count, and progress is
session-scoped with persistence deferred to a separate story. The one
consequence worth a second look after the work lands is assumption 8 — tiles
reading 0% for playlists not yet entered in the session, which is a direct
consequence of the chosen denominator and could later be removed by prefetching
playlist sizes from the game list.
