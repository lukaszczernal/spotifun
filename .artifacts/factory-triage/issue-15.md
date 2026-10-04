<!-- mastra-factory-triage -->

|                |                                                                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**       | feature request — add per-playlist progress: track which songs a player has guessed, derive a completeness percentage, mark a playlist complete at 80% or a 10/10 round, and bias the draw toward unguessed songs |
| **Route**      | Await approval                                                                                                                                                               |
| **Severity**   | 🟡 medium — nothing is broken; this adds a progression layer the game currently has no concept of                                                                            |
| **Confidence** | high — the whole state surface is small and fully read; the absence of persistence, of per-playlist scoring, and of a working replay route were each verified by running code |
| **Effort**     | high — needs a new persisted, playlist-keyed store plus changes to the game store, the draw logic, the game list, and the stage HUD, with a denominator that is not stable     |
| **Impact**     | medium — adds a reason to replay, but no existing workflow is blocked; the game is fully playable today                                                                       |
| **Next step**  | Maintainer to settle the completeness denominator and the persistence scope (see open questions), then plan across `src/services/useGame.tsx`, `src/services/useTrackStore.ts`, `src/GameList/GameList.tsx` and `src/Stage/Stage.tsx` |

### Understanding

Not a defect. Four related additions, all of which depend on one thing the app does not have: **any state that outlives a single round.**

**What exists today.** `useGame.tsx:19-44` holds `answers: Score[]` — one entry per guess, each `{ correctTrack, selectedTrack }` — and derives `guessCount`, `scoreCount`, `failsCount`, `isRoundOver`. The guessed songs are therefore *already* recorded; `score.correctTrack` on every correct entry is exactly the "list of guessed songs" the issue asks for. Two things stop it being usable as progress:

1. **It is wiped on every stage mount.** `Stage.tsx:80-82` calls `gameAction.resetGame()` in `onMount`.
2. **It is not keyed by playlist.** One global store is mounted once in `index.tsx:13` for the whole app, so three playlists would share one pool of answers.

There is **no persistence of any kind** — `grep` for `localStorage|sessionStorage|indexedDB` across `src/` returns nothing. Progress dies on reload. This is the bulk of the work, not the badge rendering.

**The draw.** `useTrackStore.ts` is instantiated per-Stage from `params.playlistId` (`Stage.tsx:42-43`), so its `played`/`staged` flags are per-session only. Randomisation is two steps: a shuffle of the whole playlist at load (`useTrackStore.ts:132-137`) and `drawTracks` taking `freeTracks().slice(0, count)` off the front (`:60-64`). "Promote songs the user has not guessed yet" lands cleanly here — partition `freeTracks()` by a persisted guessed-set and draw from the unguessed partition first. Note this is about the *mystery* track; the other three covers on a stage are decoys and arguably should not be weighted.

**The surfaces to render on.** `GameList.tsx:24-42` is a hard-coded array of `{ id, title, imageUrl }` with no data source — tiles need a progress lookup injected before they can show a badge or a percentage. The in-stage HUD already exists at `Stage.tsx:225-232` (`Score / Fails / Guess: n / 10`) and is the natural slot for the playlist percentage.

**The denominator is the hard part.** "80% of the songs" needs a stable total, and the app does not have one. `usePlaylist.ts:43` filters to tracks that have a `preview`, and Deezer previews are region-dependent (documented in `README.md`). Measured live against the three shipped playlists:

| Playlist      | `nb_tracks` | playable (has preview) |
| ------------- | ----------- | ---------------------- |
| 394652815     | 68          | 35                     |
| 9010236822    | 40          | 40                     |
| 67784289      | 84          | 24                     |

So a percentage computed against `nb_tracks` can be mathematically uncompletable (24/84 = 29% ceiling for "2010"), while one computed against the playable count shifts between sessions and regions — stored progress can exceed a later-computed total. Whichever is chosen must be decided deliberately; see open questions.

**A blocker on the replay path.** Accumulating progress requires replaying the same playlist, and that route is currently broken: `ScoreBoard.tsx:50` links "One more round" to `/game`, which matches neither `/game/score` nor `/game/:playlistId`. Verified against the real route table from `App.tsx` — `/game` resolves to the **Splash** screen, not a stage (`.artifacts/repro/replay-route-repro.jsx`). A player finishing a round is bounced to the start screen and loses the playlist context. This feature is not meaningfully testable until the scoreboard returns to `/game/:playlistId`; treat it as in scope.

**Suggested direction.** A single `useProgress` service keyed by playlist id, persisted to `localStorage`, holding a set of guessed track ids plus a `completed` flag. `Stage.tsx`'s existing `addScore` call site (`:187-190`) is the one place a guess is recorded, so it is the only write point needed. `useGame` keeps its per-round role unchanged; `GameList` and the stage HUD read from the new store; `useTrackStore.drawTracks` consults it for the weighting. No change to the round mechanics themselves.

**Related.** #14 (reworks the correct-guess resolution in `Stage.tsx` — same `checkAnswer` chain this needs to write from, so these two will conflict if planned in parallel), #13 (cover drawing on a stage), #7/PR #8 (where `ROUND_LENGTH = 10` and the scoreboard came from), #10/PR #12 (the game list tiles).

### Assumptions

- **Classified as a feature request, not a bug** — nothing described as "current" is malfunctioning; the issue is written purely as desired behaviour.
- **"Guessed" means guessed correctly.** A song answered wrongly does not count toward completeness, otherwise the percentage measures time played rather than skill. It should, however, stay in the pool as a priority candidate for re-asking.
- **The two completion rules are an OR**, as written: a playlist is complete at ≥80% guessed *or* after any single 10/10 round. The 10/10 shortcut is deliberately generous on long playlists.
- **The 10/10 rule reads `scoreCount() === ROUND_LENGTH` at round end**, using the existing round store rather than a new counter.
- **Progress is per playlist, not global** — the tiles show a per-tile percentage, so the store must be keyed by the playlist id already present in `GameList.tsx` and in `params.playlistId`.
- **Progress persists across reloads via `localStorage`.** A percentage that resets on refresh would not survive a playlist of 35 songs at 10 per round. No backend exists and none is implied.
- **The completeness percentage counts distinct songs ever guessed, not a per-round score** — this is what makes repeated rounds accumulate.
- **Weighting applies to the mystery track selection**, not to the decoy covers.
- **The weighting is a preference, not a hard filter** — once every song is guessed the draw must still work, so unguessed songs are drawn first and guessed ones fill the remainder.
- **The `completed` badge is sticky.** Once earned it stays, even if the playable track count later rises and drops the live percentage back under 80%.
- **The scoreboard replay route must be repaired as part of this work** — verified broken above, and it blocks the feature's core loop.
- **Default denominator is the playable track count observed at load**, clamped so stored progress can never exceed it. This is the only figure the app can actually compute, but it is the weakest assumption here and is raised as an open question.

### Open questions

- **Which denominator defines 80%** — `nb_tracks` (stable across sessions, but makes "2010" uncompletable at a 29% ceiling) or the playable count (reachable, but drifts by region and session)? This is a product call about whether "complete" must be attainable for every shipped playlist.
- **Should progress be shown as earned, or reset on demand?** No "reset progress" affordance is requested; without one a completed playlist offers nothing on replay.

### Reproduction

Not applicable — feature request. Current behaviour was verified rather than reproduced:

- `grep -rn "localStorage\|sessionStorage\|indexedDB" src/` → no matches; no persistence layer exists.
- `grep -rn "percent\|badge\|guessed\|complet" src --include=*.ts --include=*.tsx` → one unrelated comment in `useTrackStore.ts:88`; no completion, percentage or badge code exists.
- `npx vite build --config .artifacts/repro/game-list.config.mjs && node .artifacts/repro/game-list-runner.mjs` → renders the real `GameList`: three tiles, each with only href/title/image, no progress affordance.
- `npx vite build --config .artifacts/repro/replay-route.config.mjs && node .artifacts/repro/replay-route-runner.mjs` → `/game -> splash`, `/game/9010236822 -> stage`, `/game/score -> scoreboard`, confirming the scoreboard replay link drops the player out of the game.
- Playable-track counts in the table above came from `curl https://api.deezer.com/playlist/<id>` filtered on `preview`, matching the filter in `usePlaylist.ts:43`.
