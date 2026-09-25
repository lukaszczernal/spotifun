# Plan — Issue #10: add a second playlist to choose from

Repo `lukaszczernal/spotifun`, branch `factory/issue-10`, base commit `1d87321`
(Merge PR #8 from `factory/issue-7`). No test runner exists; this repo verifies
behaviour with headless harnesses under `.artifacts/repro/` (pattern established by
#3 / PR #4, extended by #5 and #7). This plan follows that grain.

## Goal

The game list offers two playlists instead of one. Alongside the existing
"Your favourites" tile, a second tile titled **"00's Jazz"** links to
`/game/9010236822` and shows Deezer's own playlist artwork. Tapping it starts a
normal game against that playlist — no code outside the game list changes, because
`/game/:playlistId` is already generic. Done means: the new harness
`.artifacts/repro/game-list-runner.mjs` exits 0, `npx tsc --noEmit` reports no error
under `src/`, and `npx vite build` succeeds.

## Verified understanding

Re-confirmed against the working tree at `1d87321` (the branch has no commits beyond
master, so the triage findings still hold):

1. **The playlist catalogue is a one-entry literal.** `src/GameList/GameList.tsx:24-30`
   is the whole menu: a single object `{ id: "394652815", title: "Your favourites",
   imageUrl: favouritesCover }`. `Tile` (L12-21) renders
   `<Link href={`/game/${id}`}><img src={imageUrl} alt={title}/>…<h3>{title}</h3></Link>`.
   Adding a playlist is adding one object.
2. **Nothing downstream is playlist-specific.** `src/App.tsx:24` routes
   `/game/:playlistId` to `Stage`; `src/services/usePlaylist.ts:10-13` builds
   `https://api.deezer.com/playlist/${playlistId}` straight from the route param;
   `useTrackStore` treats the id as opaque data. No registry, no switch, no config.
3. **The playlist clears the app's gates.** `GET https://api.deezer.com/playlist/9010236822`
   → `200`, `public: true`, `nb_tracks: 40`, **31 with a `preview`**. `usePlaylist.ts:45-51`
   rejects fewer than `STAGE_SIZE` (4) playable tracks; `config.ts` sets `ROUND_LENGTH = 10`.
   31 previews clears both with wide margin — better supplied than the shipped playlist
   `394652815`, which returns 55 tracks / **22** previews. JSONP verified:
   `?output=jsonp&callback=cb1` returns a valid wrapped payload, matching
   `src/services/jsonp.ts:30-33`.
4. **Deezer's title is `00's Jazz`**, not "2000's Jazz" as the issue body writes it.
   The maintainer has confirmed the tile should carry Deezer's original title.
5. **The grid already fits two tiles.** `GameList.module.css:1-6` is
   `grid-template-columns: 1fr 1fr`. A second tile lands in the existing layout; zero CSS.

Two findings **new to this planning pass**:

6. **The `picture` field is a trap.** `https://api.deezer.com/playlist/9010236822/image`
   looks like the stable, id-based choice, but `curl -L` shows it 302-redirects to a
   **120×120** thumbnail — far too small for a tile that is `aspect-ratio: 1` at half the
   viewport width, and it costs an extra round trip. Use the `picture_big` CDN URL
   (`…/97a9dddf8d1b8d73fce5d6005ba58436/500x500-000000-80-0-0.jpg`, verified
   `200 image/jpeg`, 40 KB) instead. `picture_medium` (250×250) would visibly soften on
   high-DPI screens.
7. **No image in this codebase has an error fallback.** `Cover.tsx:84` and
   `PlayerControls.tsx:35` both render a bare `<img>` with no `onerror`. A remote tile
   cover is a new *source* of image failure but not a new *class* of it, and adding a
   fallback only to this one tile would be an unprecedented pattern. Not in scope
   (see Assumptions 4 and Risks).

## Scope

**In:** one entry in the `tiles` array; a headless harness asserting the game list
renders both tiles with the right hrefs, titles and image sources; the README's
singular "a public Deezer playlist"; a `.artifacts/repro/README.md` section for the
new check.

**Out:** changing or re-hosting the existing "Your favourites" cover; any playlist
registry, config file or API-driven game list; fetching tile titles or artwork at
runtime; a loading/error state for the game list; adding a test framework; CSS
changes; a third or subsequent playlist.

## Phase 1 — Add the tile

**`src/GameList/GameList.tsx`** — append one object to the `tiles` array (L24-30):

```ts
{
  id: "9010236822",
  title: "00's Jazz",
  imageUrl:
    "https://cdn-images.dzcdn.net/images/playlist/97a9dddf8d1b8d73fce5d6005ba58436/500x500-000000-80-0-0.jpg",
},
```

No other edit. Do **not** touch the `favouritesCover` import, the `Tile` component, the
`TileProps` interface, or the CSS module. Do not extract the URL into a constants file
or a `playlists.ts` — two literal entries is the right amount of structure, and the
existing entry establishes the shape.

**Test** — new `.artifacts/repro/game-list-repro.jsx`, `game-list.config.mjs` and
`game-list-runner.mjs`, copying the scaffolding of the existing `cover-tap` trio
(config: `vite-plugin-solid`, `build.lib` entry, `outDir: .artifacts/repro/out-game-list`,
`minify: false`; runner: the same JSDOM global-installation prologue, then
`await import("./out-game-list/game-list-repro.mjs")`, print JSON, assert, `process.exit(1)`
on failure).

`GameList` uses `Link` from `solid-app-router`, so it must be rendered inside a
`<Router>`. Reuse the memory-source trick from `stage-round-repro.jsx:65-68`:

```jsx
const location = { value: "/gamelist" };
const routerIntegration = { signal: [() => location, (next) => Object.assign(location, next)] };
render(() => <Router source={routerIntegration}><GameList /></Router>, root);
```

Assert, reading the real DOM:
- exactly **2** tiles render (`root.querySelectorAll("a")`), guarding against both a
  dropped entry and an accidental duplicate (issue #7's PR series shipped a duplicated
  tile that needed a follow-up commit to remove — this assertion is the regression guard
  for exactly that);
- the hrefs are `/game/394652815` and `/game/9010236822`, in that order — the new
  playlist is added *alongside*, not in place of, the existing one;
- every tile id is distinct;
- the new tile's `<h3>` text is exactly `00's Jazz`;
- every tile has a non-empty `img[src]` and an `alt` equal to its title.

Deliberately **not** asserted: that the CDN URL resolves. The harness runs offline in
JSDOM and a network assertion would make it flaky and slow. Reachability is checked once,
manually, in Phase 2.

**Verify**
```bash
npx tsc --noEmit 2>&1 | grep '^src/'            # expect no output
npx vite build --config .artifacts/repro/game-list.config.mjs
node .artifacts/repro/game-list-runner.mjs      # expect exit 0
```
(`npm install --no-save jsdom` first if not already present — see `.artifacts/repro/README.md`.)

Note: `npx tsc --noEmit` emits one pre-existing, unrelated `TS2688: Cannot find type
definition file for 'vite/client'` at the root. Filtering on `^src/` is the established
way this repo reads that output; do not attempt to fix it here.

## Phase 2 — Docs and manual confirmation

**`README.md:12`** — the line reads "the quiz is built from a public Deezer playlist".
That is now inaccurate. Change to wording that reflects a choice of playlists (e.g.
"…built from public Deezer playlists, which you pick from the game list"). One sentence;
do not restructure the section.

**`.artifacts/repro/README.md`** — add a short "Game list (issue #10)" section with the
two commands, matching the format of the existing sections.

**Manual check** (the one thing the harness cannot cover):
```bash
npx vite build && npx vite preview
```
Open `/spotifun/#/gamelist`: confirm two tiles side by side, the jazz cover actually
loads from the CDN (not a broken-image icon), and tapping it starts a game that reaches
a playable stage with four covers and audio.

## Risks

- **The CDN URL rots.** The `md5_image` hash is undocumented as permanent; if Deezer
  re-arts the playlist the tile shows a broken image with no fallback (finding 7). Catch
  it in the Phase 2 manual check. The fix would be refreshing the constant. Accepted:
  the app already hard-depends on Deezer at runtime for every track.
- **Region-dependent previews.** README already warns availability varies by country.
  31/40 previews in the test region is a wide margin, but a heavily restricted region
  could in principle drop below `STAGE_SIZE`, in which case `usePlaylist` rejects and the
  existing error path handles it — unchanged behaviour, no new work.
- **Harness selector drift.** Asserting on `root.querySelectorAll("a")` depends on
  `Tile` rendering a `Link`. CSS-module class names are hashed at build time
  (`._tile_1w85g_8`), so the harness must not select on `.tile`. Using the element
  selector avoids the trap that would otherwise make the check silently pass with zero
  matches.
- **Mixed cover sourcing.** One tile bundles its image, the other fetches it. The
  asymmetry is visible to the next reader and could invite a premature "unify this"
  refactor. The plan records it as deliberate (Assumption 3) rather than hiding it.

## Assumptions

1. **The new tile is added alongside "Your favourites", not in place of it.** The issue
   says "add new playlist to choose from"; a one-entry menu has no purpose. Asserted in
   the harness.
2. **The title is the literal string `00's Jazz`** — Deezer's own title, per the
   maintainer's instruction to keep the original. Implemented as a hardcoded string like
   the existing entry, *not* by fetching `title` from the API at render time: that would
   require a resource, a loading state and an error state in a component that currently
   has none, for a value that changes approximately never.
3. **Cover art is Deezer's hosted `picture_big`, referenced by URL** — per the
   maintainer's instruction to get the picture from the Deezer playlist. Read as
   "reference Deezer's image", not "download and commit it". The URL is hardcoded rather
   than resolved through an API call, keeping the game list a static array. This makes
   the two tiles source covers differently; accepted for a two-entry array.
4. **No `onerror` fallback on the tile image**, matching every other `<img>` in the
   codebase (finding 7). Introducing a fallback pattern for one tile is out of proportion.
5. **No playlist registry or abstraction.** A config-driven catalogue is not warranted
   until a third or fourth playlist arrives; the codebase's grain is literal arrays.
6. **Verification is by headless harness**, not a new test framework — the repo has no
   test runner and `.artifacts/repro/` is the convention from #3, #5 and #7. Adding
   Vitest is out of scope.
7. **`.artifacts/repro/out*` stays gitignored, harness sources are committed**, matching
   how #3, #5 and #7 left their harnesses in the tree.
8. **The `394652815` tile keeps its bundled JPEG.** Migrating it to a Deezer URL for
   consistency is unrequested scope and would risk the one tile that works today.

## Open questions

None. Both design questions raised at triage — tile label and cover-art source — were
answered by the maintainer and are recorded as Assumptions 2 and 3.
