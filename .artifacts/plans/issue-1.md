# Plan — Issue #1: Switch from Spotify API to Deezer

## Goal

Replace the Spotify Web API with the public Deezer API as spotifun's only data source. When a user opens `/game/:playlistId`, track data is fetched from `https://api.deezer.com/playlist/{id}` via JSONP, mapped into an app-owned `Track` model, and played through the existing game loop unchanged. All Spotify code — OAuth, the auth guard, the login route, and the user-library hooks — is deleted rather than left dormant.

**Done means:** `npx vite build` succeeds; `npx tsc --noEmit` reports exactly one `src/` error (the pre-existing `Cover.tsx` one, see Baseline); and a manual run of `/#/game/394652815` renders four covers, plays a preview, and records a score with title and artist.

## Baseline — read this before you start

Three facts about the current branch that the plan depends on. All were verified on `factory/issue-1` at `e417f8e`.

**1. `pnpm install` is broken. Use npm.**
```
ERR_PNPM_SPEC_NOT_SUPPORTED_BY_ANY_RESOLVER
  "deepclone-js@gist:0bce1161cfd2aa91ae7cad9abb42c342" isn't supported by any available resolver
```
Also `pnpm-lock.yaml` is lockfileVersion 5.3, rejected by modern pnpm. `npm install --no-audit --no-fund` succeeds (344 packages). `deepclone-js` is unused in `src/` — do not try to fix it, just use npm.

**2. `tsc --noEmit` already fails on a clean checkout.** A "type-check is clean" gate is not available. Current `src/` errors:

| File | Error |
| --- | --- |
| `ScoreBoard.tsx(32,29)` | TS7006 `artist` implicitly `any` |
| `Cover.tsx(74,14)` | TS2454 `coverRef` used before assigned |
| `CoverScroll.tsx(2,10)` | TS2614 no exported member `Track` |
| `CoverScroll.tsx(3,24)` | TS2307 cannot find module `swiper` |
| `PlayerControls.tsx(3,10)` | TS2614 no exported member `Track` |
| `useGame.tsx(4,10)` | TS2614 no exported member `Track` |
| `useTracks.ts(43,3)` | TS2769 no overload matches |

There are also `node_modules` errors (`@babel/core`, `workbox-core`) — ignore those; they don't block `vite build`, which passes today.

**3. The three TS2614 errors hide a real type bug you must fix.** `CoverScroll`, `PlayerControls`, and `useGame` all do `import { Track } from './useTracks'`, but `useTracks.ts` never exports `Track`. Because that import resolves to an error type, the members below it go unchecked. They are actually handling `TrackStageItem` (the `{ track, guessed, staged }` wrapper from `useTrackStore.ts:7`), not `Track` — note `track?.()?.track.preview_url` in `PlayerControls.tsx:17` and `score.selectedTrack?.track.album...` in `ScoreBoard.tsx:24`. Once you point these imports at a real type, the `.track` hop becomes a genuine error. Phase 2 fixes this properly by exporting `TrackStageItem`.

## Verified Deezer facts

From `GET /playlist/394652815`, run by the maintainer (the sandbox is blocked by Akamai with a `403` datacenter-IP edge block, so you cannot re-run these yourself):

- **Schema:** `id` (number), `title`, `preview`, `readable`, `artist` as a **single object** with `.name`, `album.cover_small|medium|big|xl`.
- **No pagination:** `nb_tracks: 53`, `tracks.data.length: 53`, `tracks.next: null`. No paging loop needed.
- **JSONP works:** `?output=jsonp&callback=cb` returns `cb({"id":394652815,...})`.
- **Attrition:** only **26 of 53** tracks have a usable preview. Unplayable ones have `preview: ""` **and** `readable: false`.
- **No CSP** is set in `index.html`, so injected `<script>` tags are not blocked.

## Scope

**In:** JSONP transport; Deezer fetch + mapping; app-owned `Track` model; updating the four display consumers; deleting the entire Spotify surface; `GameList` tiles; the mock fixture.

**Out:** Deezer OAuth (not needed for public playlists). The hardcoded `getRandomInt(4)` in `useTrackStore.ts:59` that should be `STAGE_SIZE` — a real latent bug, but unrelated to this migration; leave it. The pre-existing `Cover.tsx` TS2454 error. The `node_modules` type errors. Regenerating `pnpm-lock.yaml`.

---

## Phase 1 — Deezer data layer

### 1a. New file `src/services/jsonp.ts`

```ts
let counter = 0;

export const jsonp = <T>(url: string, timeoutMs = 10000): Promise<T> =>
  new Promise((resolve, reject) => {
    const callbackName = `__spotifun_jsonp_${Date.now()}_${counter++}`;
    const script = document.createElement("script");
    let timer: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(timer);
      delete (window as any)[callbackName];
      script.remove();
    };

    (window as any)[callbackName] = (data: T) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error(`JSONP request failed: ${url}`));
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`JSONP request timed out: ${url}`));
    }, timeoutMs);

    script.src = `${url}${url.includes("?") ? "&" : "?"}output=jsonp&callback=${callbackName}`;
    document.head.appendChild(script);
  });
```

Four requirements this satisfies, each of which will bite if dropped: the callback name is **unique per request** (`createResource` re-runs on `playlistId` change, and a fixed global would let a stale response overwrite a live one); cleanup runs on **all three** exit paths; the **timeout** exists because JSONP has no status codes and `onerror` does not always fire, so without it a failed load leaves the resource pending forever on a loading screen; and `script.remove()` prevents `<head>` accumulating tags across navigations.

### 1b. Rewrite `src/services/model.ts`

Delete everything currently in the file — it is a Spotify schema mirror and nothing survives.

```ts
export interface DeezerTrack {
  id: number;
  title: string;
  preview: string;
  readable: boolean;
  artist: { id: number; name: string };
  album: {
    id: number;
    title: string;
    cover_medium: string;
    cover_big: string;
  };
}

export interface DeezerPlaylist {
  id: number;
  title: string;
  nb_tracks: number;
  tracks: { data: DeezerTrack[]; next?: string };
}

export interface DeezerError {
  error?: { type: string; message: string; code: number };
}

export interface Track {
  id: number;
  name: string;
  previewUrl: string;
  artist: string;
  album: {
    id: number;
    name: string;
    coverMedium: string;
    coverBig: string;
  };
}

export interface TrackStageItem {
  track: Track;
  guessed: boolean;
  staged: boolean;
}
```

`TrackStageItem` moves here from `useTrackStore.ts:7` so the consumers in Phase 2 can import it. `useTrackStore.ts` must then import it instead of declaring it — delete the local `interface TrackStageItem` and add it to the existing `./model` import.

### 1c. Rewrite `src/services/usePlaylist.ts`

```ts
import { createResource } from "solid-js";
import { STAGE_SIZE } from "../config";
import { jsonp } from "./jsonp";
import { DeezerError, DeezerPlaylist, DeezerTrack, Track } from "./model";

type PlaylistProps = { playlistId: string };

const resolvePlaylistUrl = (playlistId: string) =>
  playlistId
    ? `https://api.deezer.com/playlist/${playlistId}`
    : "api/mocks/playlist.json";

const toTrack = (track: DeezerTrack): Track => ({
  id: track.id,
  name: track.title,
  previewUrl: track.preview,
  artist: track.artist.name,
  album: {
    id: track.album.id,
    name: track.album.title,
    coverMedium: track.album.cover_medium,
    coverBig: track.album.cover_big,
  },
});

const fetchPlaylist = ({ playlistId }: PlaylistProps) => {
  const url = resolvePlaylistUrl(playlistId);

  const request = playlistId
    ? jsonp<DeezerPlaylist & DeezerError>(url)
    : fetch(url).then((res) => res.json() as Promise<DeezerPlaylist>);

  return request
    .then((res) => {
      const error = (res as DeezerError).error;
      if (error) {
        return Promise.reject(`Deezer error: ${error.message}`);
      }
      return res.tracks.data;
    })
    .then((tracks) => tracks.filter((track) => track.preview))
    .then((tracks) => tracks.map(toTrack))
    .then((tracks) =>
      tracks.length >= STAGE_SIZE
        ? tracks
        : Promise.reject(
            `Not enough playable tracks on playlist (need ${STAGE_SIZE})`,
          ),
    );
};

const usePlaylist = ({ playlistId }: PlaylistProps) =>
  createResource<Track[], number>(() => fetchPlaylist({ playlistId }));

export default usePlaylist;
```

Three things worth understanding rather than just copying:

- **The explicit error check is not optional.** JSONP has no HTTP status. Deezer returns errors as a `200` with an `{ "error": {...} }` body, so without this check a bad playlist id flows into `res.tracks.data` and throws an opaque `TypeError`.
- **The mock path keeps using `fetch`.** It's a same-origin static file, so JSONP would be wrong there — and the mock is not JSONP-wrapped.
- **The guard is `>= STAGE_SIZE`, not `length`.** The old code rejected only at *zero* previews. With 26-of-53 attrition observed and `readable` being region-gated, a playlist could yield 2 playable tracks, pass a zero-check, and then break inside `useTrackStore`'s stage-filling effect with no error surfaced to the user. `usePlaylist.ts:30` already filtered truthily, so empty-string previews were never the risk — thin supply is.

### 1d. Replace the mock fixture

`public/api/mocks/playlist.json` (443 KB, Spotify-shaped) is the one actually served; the duplicate at `api/mocks/playlist.json` is not in the build. Replace the `public/` copy with a small Deezer-shaped fixture and delete the stale `api/` copy.

It needs **at least `STAGE_SIZE` (4)** entries with non-empty `preview`, or the new guard rejects it. Hand-write it against the schema in §Verified — you cannot fetch a real one. Use real Deezer CDN cover URLs of the form `https://cdn-images.dzcdn.net/images/cover/<md5>/250x250-000000-80-0-0.jpg`. Include one entry with `"preview": ""` so the filter path is exercised.

```json
{
  "id": 0,
  "title": "Mock playlist",
  "nb_tracks": 5,
  "tracks": { "data": [ { "id": 1, "title": "...", "preview": "https://cdn-preview-...mp3", "readable": true, "artist": { "id": 1, "name": "..." }, "album": { "id": 1, "title": "...", "cover_medium": "...", "cover_big": "..." } } ] }
}
```

### Verify Phase 1
```bash
npm install --no-audit --no-fund
npx tsc --noEmit 2>&1 | grep "^src/"
```
Expect `model.ts`/`usePlaylist.ts`/`jsonp.ts` to be absent from the output. Consumer errors will still be present — Phase 2 clears those.

---

## Phase 2 — Update consumers to the new model

Four files read Spotify-shaped fields. Fix the broken `Track` imports at the same time, since they point at the same types.

| File:line | Change |
| --- | --- |
| `Cover.tsx:76` | `props.track?.album.images[0].url` → `props.track?.album.coverBig` |
| `ScoreBoard.tsx:24` | `score.selectedTrack?.track.album.images[1].url` → `score.selectedTrack?.track.album.coverMedium` |
| `ScoreBoard.tsx:31-33` | Replace the `.artists.map(...).join(',')` block with `{score.correctTrack?.track.artist}` — this also clears the TS7006 baseline error |
| `PlayerControls.tsx:3` | `import { Track } from "../../services/useTracks"` → `import { TrackStageItem } from "../../services/model"` |
| `PlayerControls.tsx:10` | `track: Accessor<Track \| undefined>` → `Accessor<TrackStageItem \| undefined>` |
| `PlayerControls.tsx:17` | `load(track?.()?.track.preview_url)` → `load(track?.()?.track.previewUrl)` |
| `useGame.tsx:4` | `import { Track } from './useTracks'` → `import { TrackStageItem } from './model'` |
| `useGame.tsx:7-8` | `correctTrack?: TrackStageItem; selectedTrack?: TrackStageItem;` |

`Stage.tsx:19` already imports `Track` from `./model` correctly and needs no change — it passes `mysteryTrack` (a `TrackStageItem` accessor) to `PlayerControls`, which is exactly why the prop type above becomes `TrackStageItem`. `gameUtils.ts:5` does `correctTrack?.track.id` and stays valid once `Score` holds `TrackStageItem`. `useTrackStore.ts:71,80` key off `track.id`, which survives the string→number change because both sides are Deezer ids.

**Delete `src/components/CoverScroll/` entirely** (both `.tsx`, both `.css`, `index.ts`). It is imported by nothing, and it imports `swiper`, which is not in `package.json` — it is dead code contributing two baseline errors.

### Verify Phase 2
```bash
npx tsc --noEmit 2>&1 | grep "^src/"
```
Expect exactly one line: `src/components/Cover/Cover.tsx(74,14): error TS2454`. Everything else should be gone.

---

## Phase 3 — Remove the Spotify surface

Delete these files. Triage identified four; the search found nine — `usePage.ts`, `usePageCount.ts`, and `useUser.ts` are additional Spotify hooks that nothing imports, and `services/config.ts` only holds `PAGE_SIZE` for them.

```
src/services/useTracks.ts
src/services/usePage.ts
src/services/usePageCount.ts
src/services/useUser.ts
src/services/useAuth.tsx
src/services/authorize.ts
src/services/config.ts
src/services/utils.ts
src/components/AuthGuard/
src/Login/
```

`utils.ts` goes because `generateRandomString` and `getHashParams` exist solely for the OAuth flow — confirm with a grep before deleting.

Then:

- **`src/config.ts`** — delete `CLIENT_ID`, `HOST`, `REDIRECT_URI`, `SCOPE`, `STATE_KEY`, and the `getHost` helper. Keep `MAX_FAIL_COUNT` and `STAGE_SIZE`. The file should end up two lines.
- **`src/App.tsx`** — remove the `useAuth` import (line 2), the `AuthGuard` import (line 8), the `Login` import (line 11), the `const { authorize } = useAuth()!` (line 16), and the bare `authorize()` call (line 20). Remove the `/login` route (line 32). Unwrap the `/game` route: `<Route path="/game" element={<AuthGuard />}>` becomes `<Route path="/game">`. Since `useAuth.tsx:8` hardcodes `isAuthenticated = () => true`, removing the guard changes no runtime behaviour.
- **`src/Splash.tsx`** — remove the now-dangling `import { useAuth }` (line 8). The login UI there is already commented out; delete the commented `<Show>` block and its `Button href="" onClick={login}` fallback while you're in the file.
- **`src/assets/images/game-list-covers/your-favourites.jpg`** — keep. Phase 4 reuses it.

### Verify Phase 3
```bash
grep -rn "spotify\|Spotify\|useAuth\|authorize\|AuthGuard" src --include=*.ts --include=*.tsx
npx tsc --noEmit 2>&1 | grep "^src/"
npx vite build
```
The grep should return nothing. The type-check should still show only the `Cover.tsx` line. The build must succeed.

---

## Phase 4 — GameList and routing

**Tiles.** All four current ids are Spotify. Only `394652815` is a verified-working Deezer id, so ship that one tile and no invented ones:

```tsx
const tiles = [
  {
    id: "394652815",
    title: "Your favourites",
    imageUrl: "/src/assets/images/game-list-covers/your-favourites.jpg",
  },
];
```

This is the maintainer's own Deezer loved-tracks playlist (`is_loved_track: true`, titled "Ulubione utwory"), which is why the existing cover art still fits. Drop the `loginRequired` prop from `TileProps` and from the `Tile` render — the "Login Required" badge has no meaning now that there is no auth. Additional playlist ids are an open question below.

**Navigation bug.** `GameList.tsx:13` uses a plain `<a href={`/game/${id}`}>`. The router runs on `hashIntegration()` (`index.tsx:11`) and Vite builds with `base: '/spotifun/'`, so that anchor triggers a full page load of `/game/394652815`, which 404s on GitHub Pages. This is pre-existing and unrelated to Deezer, but it blocks the manual verification below, so fix it here: use `Link` from `solid-app-router`, matching the pattern `Button.tsx` already uses.

```tsx
import { Link } from "solid-app-router";
// ...
<Link className={styles.tile} href={`/game/${id}`}>
```

### Verify Phase 4
```bash
npx vite build
npm run dev
```
Open `http://localhost:4000/spotifun/#/gamelist`, click the tile, confirm the URL becomes `.../#/game/394652815` without a page reload.

---

## Phase 5 — End-to-end verification

There is no test runner in `package.json` (`scripts` has only `start`/`dev`/`build`/`serve`/`deploy`/`push-dir`), so verification is a type-check, a build, and a manual pass. Do not skip the manual pass — it is the only thing that exercises the JSONP path, which no static check can reach.

```bash
npm install --no-audit --no-fund
npx tsc --noEmit 2>&1 | grep "^src/"   # expect ONLY the Cover.tsx TS2454 line
npx vite build                          # must succeed
npm run dev
```

Manual checklist at `http://localhost:4000/spotifun/#/game/394652815`:

1. **Network tab** shows a `<script>` request to `api.deezer.com/playlist/394652815?output=jsonp&callback=__spotifun_jsonp_...`.
2. **Four covers render** (Deezer CDN `500x500` images via `coverBig`).
3. **Tap the record** → a preview plays.
4. **Select a cover and swipe up** → correct/incorrect resolves, score counter updates.
5. **Miss three times** → redirects to `/#/game/score`; the scoreboard shows the `250x250` cover, the track title, and a single artist name.
6. **`document.head`** contains no leftover `<script>` tags and `window` has no `__spotifun_jsonp_*` keys after loading — confirm in console with `Object.keys(window).filter(k => k.startsWith('__spotifun_jsonp_'))` returning `[]`.
7. **Bad id** — visit `/#/game/1` and confirm it fails cleanly via the Deezer error branch rather than hanging.

---

## Risks

| Risk | Catch it by |
| --- | --- |
| **Region attrition drops below 4 playable tracks.** `readable` is region-gated and under JSONP the request comes from the *user's* browser, not a server you control. 26/53 is a Poland number; elsewhere it could be lower. | The `>= STAGE_SIZE` guard turns this into a clean rejection rather than a half-filled stage. Verify with step 7. This is genuinely new behaviour versus Spotify, where preview availability didn't vary by viewer. |
| **JSONP leak across navigations.** A missed cleanup path accumulates `<script>` tags and globals. | Manual step 6, after navigating between playlists at least twice. |
| **Deezer errors arrive as HTTP 200.** Skipping the `error` check gives an opaque `TypeError` deep in the mapper. | Manual step 7. |
| **`<script>` injection executes arbitrary returned JS.** Accepted here: known first-party API over HTTPS, no CSP in play. Stated so it is a decision, not an oversight. | — |
| **Fixing the three `Track` imports surfaces latent errors.** They currently resolve to an error type that suppresses checking of `.track`. | Phase 2's `TrackStageItem` change is the fix; the Phase 2 gate catches it if incomplete. |
| **A future CSP would block JSONP.** None exists today. | If one is added to `index.html`, it must allow `script-src https://api.deezer.com`. |

## Assumptions

Design decisions taken during planning, and understanding corrections against triage.

1. **`artist` is a flat `string`, not an array.** Deezer's playlist `tracks.data[]` carries a single `artist` object; the `contributors` array only appears on the `/track/{id}` endpoint. *Rejected:* wrapping it in a one-element array to leave `ScoreBoard`'s `.map().join(',')` untouched — that preserves one line at the cost of a permanently dishonest model.
2. **Covers are named fields (`coverMedium`/`coverBig`), not an indexed array.** The two consumers used `images[0]` and `images[1]` with the size relationship implicit. *Rejected:* an `images[]` array mirroring Spotify, which would keep index-based access that means nothing in Deezer's schema.
3. **`Track.id` is `number`.** Deezer emits numeric ids; both `useTrackStore` comparison sites compare two Deezer tracks, so no coercion is needed. *Rejected:* stringifying in the mapper to preserve the old `string` type — pointless conversion with no consumer benefit.
4. **The model is camelCase.** The old model was snake_case only because it mirrored Spotify's JSON. An app-owned model follows the codebase's own convention (`getAccessToken`, `stageTracks`).
5. **`TrackStageItem` moves to `model.ts`.** It has three consumers outside `useTrackStore` and is the type they were always handling.
6. **`CoverScroll` is deleted, not migrated.** Nothing imports it and it depends on an uninstalled `swiper` package.
7. **`usePage`/`usePageCount`/`useUser`/`services/config.ts`/`utils.ts` are deleted.** Triage missed these; all are Spotify-only and unreferenced.
8. **The `GameList` navigation fix is in scope** despite being a pre-existing bug, because it blocks manual verification of this change.
9. **Correction to triage:** `usePlaylist.ts:30` already filtered on truthiness (`track.preview_url`), not `!== null`. Deezer's `""` empty previews were therefore never a break risk. The real supply risk is the zero-vs-`STAGE_SIZE` threshold, which is what Phase 1c changes.
10. **Correction to triage:** the mock served in production is `public/api/mocks/playlist.json`; `api/mocks/playlist.json` is a stale duplicate outside the build.
11. **The `api/mocks` fallback path is kept.** It still serves the empty-`playlistId` case and gives an offline dev path with Deezer unreachable from CI.
12. **npm is the install tool**, since pnpm cannot resolve this lockfile or the `deepclone-js` gist dependency. Not regenerating the lockfile — out of scope for this issue.

## Open questions

1. **Which additional Deezer playlists should the game feature?** Only `394652815` is verified, so Phase 4 ships a single tile. The three removed tiles ("Rabbit Hole", "Kafe Garaz 2023", "2010s radio hits") need real Deezer ids to return — a product choice, and inventing ids would ship broken tiles. Cover art for all three is already in `src/assets/images/game-list-covers/`.
2. **Is a personal loved-tracks playlist the right default?** `394652815` mutates as tracks are loved and unloved, so its playable count drifts with no code change. Fine for a personal tile; worth a stable editorial playlist if it is to be the game's front door.
