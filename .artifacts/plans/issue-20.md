# Issue #20 — completing a playlist unlocks the next one

Plan for: "Completing the stage (game) should unlock another playlist"
Base commit: `143d1f0` (the only commit in this checkout — PR #18, issue #15).

## Goal

The playlist menu becomes a progression. On entering the app only the first
playlist in the catalogue is playable; every other playlist is shown dimmed with
a "Locked" badge and cannot be opened. Finishing a playlist — the rule shipped in
#15: more than 80% of its playable songs guessed, or one faultless 10/10 round —
unlocks the next playlist in catalogue order, immediately and for the rest of the
session. A locked playlist cannot be reached by typing its URL either: the stage
route redirects a locked id back to `/gamelist`. Lock state is owned by the
progress store that already owns the guessed songs and the `completed` flag, and
is derived from `completed` rather than stored a second time. Nothing is
persisted — per the maintainer's decision, a reload re-locks everything, exactly
as percentages already reset today.

Done means: every check listed in Phase 5 passes (including the new
`playlist-lock` check and the extended `game-list` check), `npm run build`
succeeds, `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v node_modules` is
empty, and a manual session shows two dimmed tiles at `#/gamelist`, a locked id
typed as `#/game/67784289` bouncing back to the menu, and the second tile
becoming playable the moment the first playlist is finished.

## Scope

**In**

- A shared ordered playlist catalogue, extracted out of `GameList.tsx`.
- `isUnlocked(playlistId)` derived on `useProgress` from the existing `completed`
  flags plus catalogue order.
- Locked tile rendering (non-navigating, dimmed, "Locked" badge) and its CSS.
- A route guard on `/game/:playlistId` redirecting locked ids to `/gamelist`.
- Test coverage: extended `game-list` check, new `playlist-lock` check, README
  entry.

**Out**

- Persistence of any kind (`localStorage`/`sessionStorage`). Settled by the
  maintainer: locks reset on reload with the rest of the progress store.
- Unlock hint copy ("Finish X to unlock…"). Settled by the maintainer: badge only.
- Any change to the completion rule from #15 (80% / faultless round), to round
  mechanics, animations, or the guess-resolution chain in `Stage.checkAnswer`
  (issue #19 territory).
- Adding, reordering or sourcing playlists dynamically; the catalogue stays the
  same three hard-coded entries, in the same order.
- Changing what `ScoreBoard` offers after a round (still "One more round" on the
  same playlist).

## Verified understanding

Re-read against the working tree, not inherited on trust:

- `src/services/useProgress.tsx:40-115` — store keyed by playlist id holding
  `{ guessed, percent, completed, playableCount }`. `update()` (`:70-83`) raises
  `completed` when `percent > 80` and never lowers it; `completeRound()`
  (`:106-109`) sets it on a 10/10 round. `progressOf()` (`:59-60`) returns a
  shared `emptyProgress` for an id never seen. Returns the
  `[{ progress, progressOf, guessedIds }, { syncPlaylist, recordGuess, completeRound }]`
  tuple — the shape every consumer destructures.
- `src/Stage/Stage.tsx:243` records a correct guess, `:261` calls
  `completeRound`. The unlock signal is therefore already produced at the right
  moment; **no new write site is needed**.
- `src/GameList/GameList.tsx:35-53` — the catalogue is a local array of three
  `{ id, title, imageUrl }` objects, rendered by a local `Tile` (`:18-31`) as an
  unconditional `Link`. `imageUrl` for the first entry is a bundled asset import
  (`../assets/images/game-list-covers/your-favourites.jpg`); the other two are
  remote Deezer URLs.
- `src/GameList/GameList.module.css` — `.tile` (`:8-15`) carries the card
  styling and `.tile:hover` (`:17-19`) lifts it; `.tileBadge` (`:46-56`) is the
  green "Complete" pill. No locked/dimmed state exists.
- `src/App.tsx:20-27` — `/gamelist` → `GameList`, `/game/score` → `ScoreBoard`,
  `/game/:playlistId` → `Stage`, `/*` → `Splash`. No guards anywhere.
- `src/index.tsx:11-24` — `Router` (hash integration) wraps
  `ProgressProvider` → `GameProvider` → `PlayerProvider` → `App`. The progress
  store is above the router, so a guard rendered as a route element can read it.
- `solid-app-router@0.3.2` exports `Navigate` (`dist/components.jsx:96-103`): it
  calls `navigate(path, { replace: true })` during render and returns `null` —
  usable directly as a redirect element.
- Existing coverage for the touched surface:
  `.artifacts/repro/game-list-repro.jsx` + `game-list-runner.mjs` render the real
  `GameList` inside a router with the real progress store seeded, and read the
  tiles back out of the DOM. `.artifacts/repro/stage-round*`,
  `auto-check*`, `correct-reveal*` mount the real `Stage` directly (not through
  `App`'s route table), with `usePlaylist`, `animejs` and `../config` aliased to
  local stubs.

Corrections to the inherited triage understanding, recorded as assumptions below:

1. **The triage suggested guarding "in `Stage`".** Doing it inside `Stage` would
   run the component body — including `useTrackStore`, which fires the Deezer
   fetch — before the redirect. A separate guard element wrapping the route keeps
   `Stage` untouched (so it stays out of #19's way) and never mounts it for a
   locked id.
2. **The game-list harness cannot keep selecting tiles with `querySelectorAll("a")`.**
   A locked tile is deliberately not an anchor, so the selector would silently
   stop seeing it and the tile-count assertion would "pass" on a bug. Tiles must
   be read as the children of the grid container instead.

## Design

**Catalogue in `src/services/playlists.ts`, exported as an ordered array.**
Locking is positional — "the next playlist" only exists against an order — and
both the menu and the route guard need that order. A plain
`export const PLAYLISTS: PlaylistSummary[]` module alongside the other services
matches how `config.ts` already publishes shared constants.
*Rejected:* leaving the array in `GameList` and passing it to the guard — the
guard would have to import a component module for data, and `App.tsx` would gain
a dependency on the menu's internals.

**`isUnlocked(playlistId)` derived in `useProgress`, not stored.** The issue asks
for lock state to live "in the same store as the guessed tracks and the
completeness flag". A derived accessor on that store satisfies that while having
nothing to keep in sync: it reads `completed` of the preceding catalogue entry,
so it inherits stickiness for free and is correct for a playlist never opened
(whose entry does not exist yet).
*Rejected:* a `locked: boolean` field on `PlaylistProgress` — needs seeding for
unseen ids, needs a write on every completion, and can drift from `completed`.

**Unknown ids are unlocked.** `/game/:playlistId` accepts any Deezer playlist id,
not just the catalogued three, and the stage harnesses drive ids like `40`.
`isUnlocked` returns `true` when the id is not in the catalogue (index `-1`) and
for index `0`.
*Rejected:* defaulting unknown ids to locked — would break ad-hoc playlist URLs
and every existing Stage harness for no safety gain.

**A locked tile renders as a `<div>`, not a `Link` with a click guard.** The
browser then never offers the URL at all (no hover target, no middle-click, no
copy-link), which is what "locked" should mean.
*Rejected:* `Link` plus `onClick` → `preventDefault()` — leaves a real, copyable
href on screen.

**The route guard is its own element: `src/Stage/StageRoute.tsx`.** It reads
`useParams()` and `useProgress()` and renders
`<Show when={isUnlocked(id)} fallback={<Navigate href="/gamelist" />}><Stage /></Show>`.
`App.tsx` routes to `StageRoute`; `Stage` itself is unchanged, so all three
existing Stage harnesses keep mounting the bare component.
*Rejected:* an `onMount` + `navigate()` guard inside `Stage` — mounts the stage
and starts its fetch before redirecting (see correction 1).

**Scenario-driven game-list harness.** `run()` grows an optional seeding
callback so the runner can drive three sessions (fresh, first finished, first two
finished) through one bundle, rather than three near-identical harness files.
This follows `dup-cover-repro`'s existing "one harness, several configurations"
shape.

## Phases

### Phase 1 — extract the catalogue (no behaviour change)

**Changes**

- New `src/services/playlists.ts`:
  ```ts
  import favouritesCover from "../assets/images/game-list-covers/your-favourites.jpg";

  export interface PlaylistSummary {
    id: string;
    title: string;
    imageUrl: string;
  }

  /** The playlists on offer, in progression order: each one unlocks the next. */
  export const PLAYLISTS: PlaylistSummary[] = [ /* the three entries, verbatim */ ];
  ```
  Move the three objects from `GameList.tsx:35-53` unchanged, order preserved
  ("Your favourites" `394652815`, "00's Jazz" `9010236822`, "2010" `67784289`).
- `src/GameList/GameList.tsx`: delete the local array and the cover import,
  import `PLAYLISTS`, map over it.

**Tests** — none new; the existing game-list check is the guard that the menu
still renders identically.

**Verify**

```bash
npx vite build --config .artifacts/repro/game-list.config.mjs
node .artifacts/repro/game-list-runner.mjs      # must still pass unchanged
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v node_modules   # expect no output
```

### Phase 2 — `isUnlocked` on the progress store

**Changes**

- `src/services/useProgress.tsx`: import `PLAYLISTS`, add inside `getStore()`

  ```ts
  /**
   * The playlists are a progression: the first is always open, and each later
   * one opens when the playlist before it has been finished. Derived from
   * `completed` rather than stored, so there is nothing to keep in sync - and
   * because `completed` is sticky, an unlocked playlist stays unlocked.
   * Playlists outside the catalogue (an id typed straight into the URL) are
   * never locked.
   */
  const isUnlocked = (playlistId: string) => {
    const index = PLAYLISTS.findIndex((playlist) => playlist.id === playlistId);
    if (index <= 0) return true;
    return progressOf(PLAYLISTS[index - 1].id).completed;
  };
  ```

  and expose it on the readers object: `{ progress, progressOf, guessedIds, isUnlocked }`.
  Reading `progressOf` inside keeps it reactive for JSX consumers.

**Tests**

- New `.artifacts/repro/playlist-lock-repro.jsx`, `playlist-lock.config.mjs`,
  `playlist-lock-runner.mjs` (configs modelled on `stage-round.config.mjs`;
  runner on `game-list-runner.mjs`'s JSDOM bootstrap). This phase adds the
  store-level half, exported as `storeChecks()` driving the real `getStore()`
  under `createRoot`:
  1. fresh store → only `PLAYLISTS[0]` unlocked;
  2. finishing `PLAYLISTS[0]` (via `syncPlaylist` + enough `recordGuess` calls to
     pass 80%) unlocks `PLAYLISTS[1]` and leaves `PLAYLISTS[2]` locked;
  3. finishing `PLAYLISTS[1]` via `completeRound(id, ROUND_LENGTH)` unlocks
     `PLAYLISTS[2]` — proving both completion routes unlock;
  4. unlocking is sticky: after `syncPlaylist(PLAYLISTS[0].id, <much larger count>)`
     drops its percentage back under the mark, `PLAYLISTS[1]` stays unlocked;
  5. an id not in the catalogue (`"40"`) is unlocked.

**Verify**

```bash
npx vite build --config .artifacts/repro/playlist-lock.config.mjs
node .artifacts/repro/playlist-lock-runner.mjs
```

### Phase 3 — locked tiles in the menu

**Changes**

- `src/GameList/GameList.tsx`:
  - `Tile` gains `unlocked: () => boolean` (accessor, like `percent`/`completed`,
    so a tile unlocks without a remount when the player returns from a round).
  - Unlocked branch: today's `Link`, unchanged.
  - Locked branch: a `<div>` with the same `styles.tile` plus `styles.tileLocked`
    and `aria-disabled="true"`, containing the same `<img>`, a
    `<span class={`${styles.tileBadge} ${styles.tileBadgeLocked}`}>Locked</span>`
    badge and the `<h3>` title. The `% guessed` line is omitted — a locked
    playlist is by construction one the player has never been able to open, so it
    would always read `0% guessed`.
  - `GameList` passes `unlocked={() => isUnlocked(playlist.id)}` from
    `useProgress`.
- `src/GameList/GameList.module.css`: add

  ```css
  .tileLocked { opacity: 0.4; cursor: default; }
  .tileLocked:hover { transform: none; }
  .tileBadgeLocked { background: #5c5c5c; color: #fff; }
  ```

**Tests**

- `.artifacts/repro/game-list-repro.jsx`: `run(seed)` takes an optional
  `(progressAction) => void` seeding callback instead of seeding inline; read
  tiles from the grid container's children (`root.firstElementChild.children`)
  rather than `querySelectorAll("a")`, and report `locked: tile.tagName !== "A"`
  alongside the existing fields.
- `.artifacts/repro/game-list-runner.mjs`: run three scenarios against the one
  bundle and assert the full tile shape for each:
  - *fresh session* — `[unlocked 0% no badge, locked "Locked" no href, locked "Locked" no href]`;
  - *first finished* (today's seeding: favourites 9/10, jazz 10/40) —
    `[unlocked 90% "Complete", unlocked 25% no badge, locked "Locked"]`;
  - *first two finished* (additionally `completeRound("9010236822", ROUND_LENGTH)`) —
    all three unlocked with live hrefs, the third at `0% guessed` and unbadged.
  Keep the existing per-tile assertions (count, order, hrefs, titles, alt text,
  no duplicates) for unlocked tiles, and assert locked tiles carry **no** `href`
  attribute at all.

**Verify**

```bash
npx vite build --config .artifacts/repro/game-list.config.mjs
node .artifacts/repro/game-list-runner.mjs
```

### Phase 4 — guard the stage route

**Changes**

- New `src/Stage/StageRoute.tsx`:

  ```tsx
  const StageRoute = () => {
    const params = useParams();
    const [{ isUnlocked }] = useProgress();
    return (
      <Show when={isUnlocked(params.playlistId)} fallback={<Navigate href="/gamelist" />}>
        <Stage />
      </Show>
    );
  };
  ```

  with a comment explaining that the hash router exposes `/game/:playlistId`
  directly, so gating the tile is not a gate.
- `src/Stage/index.ts`: also export `StageRoute`.
- `src/App.tsx`: `<Route path="/:playlistId" element={<StageRoute />} />`.

**Tests**

- Extend `.artifacts/repro/playlist-lock-repro.jsx` with a `routeChecks()` export
  that renders the real route table shape from `App.tsx`
  (`/gamelist` → marker, `/game/:playlistId` → `StageRoute`) inside a `Router`
  with the in-memory integration used by the other harnesses, wrapped in the real
  `ProgressContext`, `GameContext` and a stubbed `PlayerContext` (copy
  `stage-round-repro.jsx`'s `playerStub`). Assert:
  1. locked id (`PLAYLISTS[2].id`) on a fresh store → `location.value` becomes
     `/gamelist`, the gamelist marker is in the DOM and no stage covers are;
  2. the first playlist id → the stage renders (covers present), no redirect;
  3. after finishing `PLAYLISTS[0]`, `PLAYLISTS[1]`'s id renders the stage.
- `.artifacts/repro/playlist-lock.config.mjs` aliases, as `stage-round.config.mjs`
  does: `animejs` → `stage-round.stub-anime.js`, `../config` and `../../config` →
  `config.stub.ts`, and `./usePlaylist` → a **new**
  `.artifacts/repro/usePlaylist.fixed.stub.ts` that always returns a 10-track
  playlist. The existing `usePlaylist.stub.ts` reads the playlist id as the track
  count, which for the real catalogue ids (`9010236822`) would try to build
  billions of tracks.

**Verify**

```bash
npx vite build --config .artifacts/repro/playlist-lock.config.mjs
node .artifacts/repro/playlist-lock-runner.mjs
```

### Phase 5 — document and run the whole suite

**Changes**

- `.artifacts/repro/README.md`: add an "## Playlist unlocking (issue #20)"
  section describing `playlist-lock` and its two halves, note the extra
  scenarios the game-list check now covers, and add `#20` to the title line.

**Verify** — the full suite, all exiting zero:

```bash
npm install && npm install --no-save jsdom
for check in stage-behaviour fallback dup-cover reveal cover-leak cover-tap \
             round-state round-length score-timing stage-round game-list \
             auto-check correct-reveal progress replay-route playlist-lock; do
  npx vite build --config ".artifacts/repro/$check.config.mjs" >/dev/null || exit 1
  node ".artifacts/repro/$check-runner.mjs" || exit 1
done
node .artifacts/repro/recycle-repro.mjs
npm run build
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v node_modules   # expect no output
```

Plus a manual pass: `npm run dev`, open `#/gamelist` — one playable tile, two
dimmed with "Locked"; type `#/game/67784289` — bounced back to `#/gamelist`;
play `#/game/394652815` to a 10/10 round and confirm "00's Jazz" becomes
playable on return without a reload.

## Risks

- **`Navigate` redirecting during render.** It calls `navigate()` in the
  component body. With the in-memory harness integration this is observable as
  `location.value`; in the app it is a hash change. If it misbehaves under the
  hash router, the fallback is an `onMount(() => navigate("/gamelist", { replace: true }))`
  inside `StageRoute` — still before `Stage` mounts. Catch it in the Phase 4
  check and in the manual pass.
- **Redirect loop.** Only possible if `/gamelist` itself were ever guarded; it is
  not, and `isUnlocked` is total (unknown → unlocked). The Phase 4 check asserts
  the final location is `/gamelist`, which a loop would not produce.
- **A player locked out mid-flow.** `ScoreBoard`'s "One more round" points at the
  playlist just played, which is by definition unlocked — and unlocking is
  sticky, so it cannot close behind them. Covered by `replay-route` staying green.
- **Harness selector change hiding regressions.** Moving the game-list harness off
  `querySelectorAll("a")` is itself the fix for a blind spot; guard it by asserting
  locked tiles have no `href` *and* that the fresh-session scenario still finds
  three tiles.
- **Bundle-size/perf of the new harness.** It mounts the real `Stage`; without
  the config stubs a run takes ~20s and hits the network. If the check hangs,
  the alias list is the first thing to check.
- **CSS modules class composition.** `${styles.tileBadge} ${styles.tileBadgeLocked}`
  relies on source order for the background override; verify visually in the
  manual pass rather than trusting specificity.

## Assumptions

- Classified as a feature request; nothing described is malfunctioning.
- Unlocking is sequential and positional: playlist *N* opens when playlist *N-1*
  is complete. Completing a later playlist unlocks nothing out of order.
- The existing array order in `GameList.tsx` is the progression order; the first
  entry ("Your favourites") is always unlocked.
- Lock state is derived from `completed`, not stored — reading the issue's "same
  store" requirement as *the progress store owns it*.
- Playlist ids outside the catalogue are unlocked.
- A locked tile omits the `% guessed` line (it can only ever be 0%) and shows a
  neutral-grey "Locked" badge in the existing badge slot; no unlock-hint copy,
  per the maintainer.
- The guard lives in a new route element, not in `Stage`, so `Stage` is untouched
  and no fetch starts for a locked id (correction 1 above).
- The game-list harness reads tiles as grid children rather than anchors, since a
  locked tile is not an anchor (correction 2 above).
- `tsc --noEmit` is not clean on this repo: ~40 pre-existing `node_modules`
  errors. The gate is the `grep -v node_modules`-filtered output, as in the #15
  plan. There is no lint or test script in `package.json`.
- No persistence, per the maintainer: locks reset on reload with the rest of the
  store. The route guard is what keeps a reset lock from being sidestepped by a
  typed URL.
- The completion rule from #15 (>80% or a faultless round) is taken as given.

## Open questions

None. Both previously open decisions (persistence, locked-tile presentation) were
settled by the maintainer and are recorded above.
