<!-- mastra-factory-triage -->

|                |                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Type**       | bug — the stage is de-duplicated by track id, but covers are an album property, so two tracks from one album render the same image |
| **Route**      | Plan fix                                                                                                                         |
| **Severity**   | 🟠 high — the core guessing loop becomes unanswerable; on the shipped "00's Jazz" playlist 68.7% of rounds contain such a guess    |
| **Confidence** | high — reproduced deterministically against the real `useTrackStore`, and confirmed against live Deezer data for all 3 playlists  |
| **Effort**     | low — one draw function in a single file; no API, state-shape or component changes                                                |
| **Impact**     | high — a correct answer becomes a coin flip with no workaround, and the player is scored as wrong for it                          |
| **Next step**  | Make the stage draw distinct *albums*, not just distinct tracks, in `drawTracks` and the end-of-playlist fallback                 |

### Understanding

**Root cause.** The track pool is de-duplicated by **track id**, but a cover is a property of the **album**. `useTrackStore.drawTracks` (`src/services/useTrackStore.ts:60-64`) takes the first `STAGE_SIZE` entries off `freeTracks()` and marks them `staged`; `setStaged`/`markAsPlayed` (`:109-123`) both match on `item.track.id`. Nothing in that chain looks at `track.album.id`. So two *different* tracks from the *same* album are two legitimately distinct pool entries, and `Cover` renders `props.track?.album.coverBig` (`src/components/Cover/Cover.tsx:97`) — a byte-identical URL for both. The player sees one cover twice.

This is not a shuffling or a staleness bug. Every invariant the store currently promises still holds: track ids on a stage are always unique, and a played track never returns. The invariant the *game* needs — one distinct cover image per stage — was simply never expressed.

**Why it is worse than cosmetic.** When the mystery track's own album is the duplicated one, the two identical covers are both "the right picture" but only one carries the right track id. `Stage.isCorrect` compares `mysteryTrack()?.track.id === selectedTrack?.id` (`src/Stage/Stage.tsx:116-118`), so picking the visually-correct cover is scored **wrong** 50% of the time. There is no way for the player to tell the two apart.

**Measured against live Deezer data** (the three playlists in `src/GameList/GameList.tsx:24-42`, plus the mock), simulating the current draw over a 10-guess round:

| playlist          | playable tracks | distinct albums | stages with a repeated cover | guesses that are a coin flip | rounds hitting ≥1 |
| ----------------- | --------------- | --------------- | ---------------------------- | ---------------------------- | ----------------- |
| `Your favourites` | 35              | 31              | 6.4%                         | 3.3%                         | 25.4%             |
| `00's Jazz`       | 31              | **14**          | 29.6%                        | 15.2%                        | 68.7%             |
| `2010`            | 24              | 21              | 7.1%                         | 3.6%                         | 19.9%             |
| mock playlist     | 20              | 15              | 14.9%                        | 7.4%                         | 32.1%             |

`00's Jazz` is the outlier because it is largely live/compilation albums contributing 3 tracks each — it has only 14 distinct albums behind 31 tracks. This explains the reporter's "on some occasions": the rate is strongly playlist-dependent, and on the playlist most people open first (`Your favourites`) it is uncommon enough to look random.

**Affected surface.** `src/services/useTrackStore.ts` only. Two draw paths need the album constraint:

1. `drawTracks` (`:60-64`) — the primary path, used by both the initial-stage effect (`:42-52`) and `reshuffleStage`.
2. The end-of-playlist fallback in `reshuffleStage` (`:81-84`) — when fresh tracks run out it backfills with `leaving` covers via `shuffle([...fresh, ...leaving])`, which can equally pair two same-album tracks.

**The fix will not shorten rounds.** The obvious concern is that a distinct-album constraint starves the pool near the end of a playlist. Simulated over all four playlists (5,000 rounds each), a distinct-album draw completes the full `ROUND_LENGTH` of 10 every single time — 0% short rounds, including on `00's Jazz` with its 14 albums. `STAGE_SIZE` is 4 and every shipped playlist has ≥14 distinct albums, so the constraint has ample headroom. The existing `reshuffleStage` boolean contract (`:77`, consumed at `src/Stage/Stage.tsx:202-207`) already handles genuine exhaustion correctly and should be kept as the safety net rather than replaced.

**Secondary observation, not the cause.** `resetTracks`'s shuffle at `:132-137` uses `sort(() => Math.random() > 0.5 ? 1 : -1)`, a comparator that is neither consistent nor transitive — it is a biased shuffle and leaves the tail of the array disproportionately in place. A correct Fisher-Yates already exists ten lines above at `:18-25`. I measured both and the duplicate-cover rate is statistically identical, so this is **not** contributing to #13 and must not be sold as the fix. It is worth folding in as a one-line tidy-up while the file is open, nothing more.

**No workaround exists.** The player cannot avoid, detect, or recover from the ambiguous stage; the only lever is choosing a playlist with more distinct albums, which is not something the UI exposes or explains.

**Related work.** No duplicates and no regression. #3 / PR #4 introduced whole-stage reshuffling and #7 / PR #8 the fixed 10-guess round — both reviewed the pool arithmetic by track id and preserved the behaviour this issue reports, so the defect has been latent since the Deezer migration (#1 / PR #2) rather than being newly introduced. Open issue #14 also touches post-correct-guess stage handling in the same file; whoever plans these should expect to coordinate on `reshuffleStage`.

### Assumptions

- **"Cover" means the album image, not the track.** The reporter says a cover appears twice; track ids on a stage are provably always unique, and album cover URLs within an album are byte-identical in live Deezer data. Album-level duplication is the only reading the evidence supports.
- **Uniqueness is scoped per stage, not per round.** The issue says "a single appearance of a cover per stage". An album whose track was already played is retired anyway, so this distinction only affects the end-of-playlist fallback; per-stage is the literal request and the cheaper guarantee.
- **De-duplicate on `album.id`, not on the cover URL.** Both work on today's data (0 cases of one URL spanning two album ids across all three playlists), but `album.id` is the stable identifier and URLs carry size/format parameters that could drift.
- **The fallback path should honour the constraint too.** Not strictly stated in the issue, but a stage assembled from leftovers is still a stage, and leaving it exempt would preserve the bug exactly where the pool is tightest.
- **Ending a round early is worse than a repeated cover**, so the existing `reshuffleStage() === false` escape hatch stays. The simulation says this should never actually trigger on the shipped playlists.

### Open questions

- If a playlist ever had fewer than `STAGE_SIZE` distinct albums, the stage cannot be built at all. Current playlists all have ≥14 so this is unreachable today, but `usePlaylist` validates `tracks.length >= STAGE_SIZE` (`src/services/usePlaylist.ts:45-51`) and would need to validate distinct albums instead. Whether to reject such a playlist up-front with a clear message or let the round simply never start is a product call.

### Reproduction

Reproduced deterministically. Harness drives the **real** `useTrackStore` with `usePlaylist` stubbed to return tracks that share albums, mirroring Deezer's shape. Files added under `.artifacts/repro/`: `dup-cover.stub.ts`, `dup-cover-repro.jsx`, `dup-cover.config.mjs`, `dup-cover-runner.mjs`.

```bash
npm install
npm install --no-save jsdom
npx vite build --config .artifacts/repro/dup-cover.config.mjs
node .artifacts/repro/dup-cover-runner.mjs
```

Result — 200 rounds per configuration, 40 tracks each:

```
--- 40 tracks, 1 track(s) per album ---
  stages showing the same cover twice: 0 (0.0%)
  PASS  distinct albums never repeat a cover

--- 40 tracks, 2 track(s) per album ---
  example stage with a repeated cover: album-11, album-1, album-6, album-6
  stages showing the same cover twice: 347 of 2000 (17.4%)
  of those, unanswerable (mystery album duplicated): 190
  FAIL  no stage repeats a cover when 2 tracks share an album

--- 40 tracks, 3 track(s) per album ---
  stages showing the same cover twice: 652 of 2000 (32.6%)
  of those, unanswerable (mystery album duplicated): 309
  FAIL  no stage repeats a cover when 3 tracks share an album

2 CHECK(S) FAILED - issue #13 reproduced
```

The one-track-per-album control passing is what isolates the cause: the store is correct whenever albums are distinct, and fails only as album sharing is introduced. The same script becomes the regression guard once the fix lands — all three configurations should pass.
