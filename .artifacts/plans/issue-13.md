# Plan — issue #13: repeated album covers on a stage

Branch: `factory/issue-13` · Single file of production change: `src/services/useTrackStore.ts`

## Goal

A stage of `STAGE_SIZE` (4) covers must never show the same album cover image twice, so that every cover on the stage is a visually distinct answer. Today the pool is de-duplicated by **track id** only (`drawTracks` at `src/services/useTrackStore.ts:60-64`, `setStaged`/`markAsPlayed` at `:109-123`), but the cover is an album property — `Cover` renders `props.track?.album.coverBig` (`src/components/Cover/Cover.tsx:97`) — so two different tracks from one album are two valid pool entries that render one identical image. When the duplicated album is the mystery track's own, both covers are "the right picture" but only one carries the matching id, and `Stage.isCorrect` (`src/Stage/Stage.tsx:116-118`, scored at `:179`) marks the visually-correct pick **wrong** half the time.

Done means: the existing `dup-cover` harness passes all three configurations (1, 2 and 3 tracks per album) with zero stages showing a repeated cover, **and** the four pre-existing harnesses (`stage-behaviour`, `fallback`, `round-length`, `recycle`) still pass unchanged — i.e. uniqueness is gained without costing playable rounds.

## Scope

**In**

- `drawTracks` — draw tracks with distinct `album.id`.
- The end-of-playlist fallback in `reshuffleStage` (`:81-84`) — apply the same constraint when topping up from `leaving`.
- The repro harness promoted to a committed regression guard, matching how `.artifacts/repro/` already guards #3/#5/#7/#9/#10.

**Out**

- No change to `src/Stage/Stage.tsx`, `Cover`, `useGame`, or any component. The fix is entirely inside the store; the `reshuffleStage(): boolean` contract consumed at `src/Stage/Stage.tsx:202-207` is preserved exactly.
- No change to the `Track`/`TrackStageItem` model or store shape.
- No new validation/rejection path in `usePlaylist` (see Assumptions — deliberately rejected).
- Not fixing issue #14; it touches the same function, see Risks.

## Design

**Approach: best-effort album uniqueness with a top-up fallback.** `drawTracks` walks `freeTracks()` and takes the first track of each *unseen album* until it has `count`. If the album constraint cannot produce `count` tracks, it tops up with the remaining free tracks (duplicate albums allowed) rather than returning a short stage.

The top-up is the critical detail. A **strict** constraint is wrong: a playlist with fewer than `STAGE_SIZE` distinct albums could never build an initial stage at all. `usePlaylist` only validates `tracks.length >= STAGE_SIZE` (`src/services/usePlaylist.ts:45-51`), so such a playlist loads fine today and plays — simulated at 10 tracks / 3 albums, a strict constraint fails to build the first stage in 5000/5000 runs, leaving the player on a permanently empty grid (`createEffect` at `:42-52` simply returns, and `Stage` renders an empty `For`). Degrading to a repeated cover is strictly better than bricking the game, and it is never *worse* than today's behaviour.

On every shipped playlist the top-up never triggers: simulated over 20,000 rounds each, all four playlists (`Your favourites` 31 distinct albums, `00's Jazz` 14, `2010` 21, mock 15) complete the full `ROUND_LENGTH` of 10 with **0** stages containing a duplicate album and **0** early exits.

**Rejected alternatives**

- *Strict uniqueness, no top-up* — bricks sub-4-album playlists, as measured above.
- *Reject such playlists in `usePlaylist`* — turns a cosmetic degradation into a hard load failure for playlists that work today, and widens the blast radius to the loader and its error UI for a case no shipped playlist hits.
- *De-duplicate on the cover URL* — equivalent on today's data (0 cases of one URL spanning two album ids across all three playlists), but `album.id` is the stable identifier; URLs carry size/format parameters that can drift.
- *Filter duplicates in `Stage.tsx` at render time* — would leave holes in the 4-cover grid and push pool logic into the view.
- *Pre-filter the playlist to one track per album in `resetTracks`* — discards playable tracks permanently and would cut `00's Jazz` from 31 tracks to 14, shortening rounds.

## Phases

### Phase 1 — album-distinct draw

`src/services/useTrackStore.ts`, replace `drawTracks` (`:60-64`). Keep the existing doc-comment style on the function and extend it to state the album rule.

Shape of the edit:

```ts
/**
 * Takes up to `count` tracks that have not been played or shown yet and marks
 * them as staged, so that they cannot be drawn a second time. Tracks are
 * picked from distinct albums: a cover image belongs to an album, so two
 * tracks from one album would render the same cover twice on the stage.
 * If there are not enough distinct albums left, the remaining slots are
 * filled with any free track - a repeated cover is better than a stage that
 * cannot be built at all.
 */
const drawTracks = (count: number): TrackStageItem[] => {
  const free = freeTracks();
  const albums = new Set<number>();
  const drawn: TrackStageItem[] = [];

  for (const item of free) {
    if (drawn.length === count) break;
    if (albums.has(item.track.album.id)) continue;
    albums.add(item.track.album.id);
    drawn.push(item);
  }

  if (drawn.length < count) {
    for (const item of free) {
      if (drawn.length === count) break;
      if (drawn.includes(item)) continue;
      drawn.push(item);
    }
  }

  drawn.forEach((item) => setStaged(item, true));
  return drawn;
};
```

Note `album.id` is typed `number` — confirm against `src/services/model.ts` and use whatever that file declares rather than hardcoding.

### Phase 2 — album-distinct end-of-playlist fallback

Same file, `reshuffleStage` (`:81-84`). Today it does `shuffle([...fresh, ...leaving]).slice(0, STAGE_SIZE)`, which can pair two same-album tracks exactly where the pool is tightest. Top up `fresh` from `leaving`, preferring unseen albums, then relax if still short:

```ts
const topUp = (base: TrackStageItem[], pool: TrackStageItem[]) => {
  const albums = new Set(base.map((item) => item.track.album.id));
  const next = [...base];
  const rest: TrackStageItem[] = [];

  for (const item of shuffle(pool)) {
    if (albums.has(item.track.album.id)) rest.push(item);
    else {
      albums.add(item.track.album.id);
      next.push(item);
    }
  }

  return [...next, ...rest].slice(0, STAGE_SIZE);
};

const nextStage =
  fresh.length === STAGE_SIZE ? fresh : topUp(fresh, leaving);
```

Preserve everything after it verbatim: the `nextStage.length < STAGE_SIZE` guard releasing `fresh` and returning `false` (`:86-91`), the `staying` release of `leaving` (`:93-98`), and `setMysteryIndex` (`:103`). The boolean contract that ends the round (`src/Stage/Stage.tsx:204`) must not change.

One behavioural note to preserve deliberately: today the fallback shuffles the combined array, so positions are randomised. `topUp` keeps `fresh` first and appends — shuffle the final `nextStage` before storing it, or the carried-over covers would always land in the same trailing slots. The existing `stage-behaviour` harness asserts covers change position, so this is caught if missed.

### Phase 3 — commit the regression guard

The reproduction already exists on this branch as untracked files: `.artifacts/repro/dup-cover.stub.ts`, `dup-cover-repro.jsx`, `dup-cover.config.mjs`, `dup-cover-runner.mjs`. The stub generates tracks whose album ids are shared in groups (`playlistId` = `"<trackCount>x<tracksPerAlbum>"`), mirroring Deezer's shape.

After Phases 1–2 all three configurations must pass. Add a section to `.artifacts/repro/README.md` in the style of the existing entries, and update its heading line (currently `# Headless checks (issues #3, #5, #7, #9, #10)`) to include #13:

```bash
npx vite build --config .artifacts/repro/dup-cover.config.mjs
node .artifacts/repro/dup-cover-runner.mjs
```

`.gitignore` already excludes `.artifacts/repro/out*`, so the build output stays untracked.

## Verification

```bash
npm install
npm install --no-save jsdom

# The fix
npx vite build --config .artifacts/repro/dup-cover.config.mjs
node .artifacts/repro/dup-cover-runner.mjs      # expect ALL CHECKS PASSED

# No regression in the stage/pool behaviour this file already guarantees
npx vite build --config .artifacts/repro/stage-behaviour.config.mjs
node .artifacts/repro/stage-behaviour-runner.mjs
npx vite build --config .artifacts/repro/fallback.config.mjs
node .artifacts/repro/fallback-runner.mjs
npx vite build --config .artifacts/repro/round-length.config.mjs
node .artifacts/repro/round-length-runner.mjs
node .artifacts/repro/recycle-repro.mjs

# Type check and production build
npx tsc --noEmit
npm run build
```

Before the fix, `dup-cover-runner.mjs` exits 1 with `2 CHECK(S) FAILED — issue #13 reproduced` (17.4% of stages duplicated at 2 tracks/album, 32.6% at 3). After, it must exit 0. The 1-track-per-album control passing both before and after is what proves the change targets album sharing specifically.

The project has no test runner — these scripts are the convention this repo uses for regression coverage, established by #3/#5/#7/#9/#10.

## Risks

- **Rounds ending early.** The constraint could starve the pool near playlist end and trip the `return false` path, cutting a round short. Measured as 0 occurrences across 20,000 simulated rounds on all four playlists; `round-length` and `fallback` harnesses are the guard. If either regresses, the top-up in Phase 2 is not relaxing correctly.
- **`drawn.includes(item)` identity.** The top-up loop relies on `freeTracks()` returning stable object references within one call. It does — `free` is captured once and `Array.filter` preserves references. Do not re-call `freeTracks()` inside the loop, and note `setStaged` is called only after both loops so the pool is not mutated mid-draw.
- **Carried-over covers landing in fixed positions.** Phase 2 changes the fallback from a shuffle to an append; the final shuffle in Phase 2 addresses it, and `stage-behaviour` catches it if dropped.
- **Overlap with issue #14**, which also touches post-correct-guess stage handling in `reshuffleStage`. Land this first — it is the smaller, well-bounded change — and rebase #14 onto it.
- **Solid store reactivity.** `setStaged` writes by index into `trackStore.tracks`; drawing more tracks per call does not change that path, but the `stage-behaviour` harness drives the real store through `createRoot`, so a broken `createEffect` chain surfaces there rather than in a type error.

## Assumptions

- **"Cover" means the album image.** Track ids on a stage are provably always unique, and album cover URLs within an album are byte-identical in live Deezer data, so album-level duplication is the only reading the symptom supports.
- **Uniqueness is best-effort, not a hard invariant.** Correction to triage, which framed it as absolute: a strict rule bricks playlists with <4 distinct albums. Graceful degradation is the only safe form of the constraint.
- **No new rejection in `usePlaylist`.** Triage left this an open question. Resolved to "no": the top-up makes it unnecessary, and no shipped playlist is close to the threshold (minimum 14 distinct albums).
- **De-duplicate on `album.id`**, not the cover URL — stable identifier, and URLs carry size parameters that can drift.
- **The fallback path honours the constraint too.** Not literally stated in the issue, but a stage built from leftovers is still a stage, and exempting it preserves the bug where the pool is tightest.
- **Uniqueness scoped per stage, not per round** — the issue's literal wording, and played albums are retired anyway.
- **The biased shuffle at `:132-137` is out of scope.** `playlist()?.sort(() => Math.random() > 0.5 ? 1 : -1)` is a non-transitive comparator and additionally sorts the resource array in place. Measured duplicate rates are statistically identical to Fisher-Yates, so it is **not** a cause of #13 and must not be bundled in as "the fix". It deserves its own issue referencing the correct `shuffle` helper that already exists at `:18-25`.

## Open questions

None blocking. The `usePlaylist` validation question raised at triage is resolved above by the top-up; if a maintainer later wants a hard guarantee of distinct covers instead of best-effort, that is a product call that would require rejecting low-album-count playlists at load time.
