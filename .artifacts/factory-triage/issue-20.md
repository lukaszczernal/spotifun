<!-- mastra-factory-triage -->

|                |                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**       | feature request — gate the playlist menu behind progression: every playlist but the first starts locked, and finishing one unlocks the next.                                                                   |
| **Route**      | Await approval                                                                                                                                                                                                |
| **Severity**   | 🟡 medium — nothing is broken; this adds a progression layer on top of the completeness work shipped in #15.                                                                                                   |
| **Confidence** | high — the store, the menu and the completion rule were all read end to end, and both open design questions have since been settled by the maintainer.                                                         |
| **Effort**     | medium — one derived accessor in `useProgress`, a shared playlist catalogue extracted out of `GameList`, locked-tile rendering plus CSS, and a route guard. Each change is small, but they span four files.    |
| **Impact**     | medium — it gives the game a progression spine, but it also takes away content players can reach today, and progression is session-scoped by design.                                                           |
| **Next step**  | Ready to plan across `src/services/useProgress.tsx`, `src/GameList/GameList.tsx`, `src/GameList/GameList.module.css` and `src/Stage/Stage.tsx`. Awaiting the stage move per non-bug policy.                    |

### Understanding

Not a defect — this is a new rule layered on the per-playlist completeness feature that landed in #15 (PR #18, commit `143d1f0`, the only commit in this checkout).

**What already exists, and why this is mostly wiring.** The hard part — deciding when a playlist is *finished* — is done. `src/services/useProgress.tsx` keeps a `PlaylistProgress` per playlist id (`guessed`, `percent`, `completed`, `playableCount`) and raises `completed` when the share guessed passes 80% (`useProgress.tsx:81`) or when a round is faultless (`completeRound`, `useProgress.tsx:106-109`). `completed` is deliberately sticky — never lowered once earned. `Stage.tsx:261` already calls `completeRound` at the end of every round, so the signal this feature keys off is produced at exactly the right moment and needs no new write site.

**Where the gate has to go.** `src/GameList/GameList.tsx:35-53` holds the playlist catalogue as a local array of three `{ id, title, imageUrl }` entries, and `Tile` (`:18-31`) renders each one as an unconditional `solid-app-router` `Link`. Confirmed against the real component with the existing headless check (`.artifacts/repro/game-list-runner.mjs`): all three tiles render with live `/game/:id` hrefs and no notion of a lock. So three things are missing — a lock state, a tile that refuses to navigate, and the styling for it (`GameList.module.css` has `.tileBadge` for "Complete" but nothing for a locked state).

**The catalogue is in the wrong place for this.** Locking is *positional* — "the next playlist" only means something against an ordered list — and that order currently lives inside the menu component. Anything else that needs to know whether a playlist is locked, in particular the stage, cannot see it. `App.tsx:22-25` routes `/game/:playlistId` directly, and the app uses a hash router (`index.tsx:13`), so a locked playlist stays reachable by URL however the tile is rendered. The catalogue should move to a shared module (alongside `src/config.ts` or a new `src/services/playlists.ts`) so both the menu and the stage guard read one ordered list.

**Where the design decision actually is.** The issue asks for the lock status to live "in the same store as the guessed tracks and completeness flag". Taken literally that means a stored `locked` boolean on `PlaylistProgress` — but that creates a second source of truth that can drift from `completed`, and it has to be seeded correctly for a playlist the player has never opened (`progressOf` returns a shared `emptyProgress` for unseen ids, `useProgress.tsx:59-60`). Deriving it instead — `isUnlocked(playlistId)` exposed from `useProgress`, computed from the ordered catalogue plus the existing `completed` flags — satisfies the stated intent (one store owns it) with no state to keep in sync, and inherits the stickiness of `completed` for free.

**Persistence: settled — none.** `useProgress` is explicitly not persisted (see its own comment at `useProgress.tsx:36-39`; `grep` for `localStorage|sessionStorage|indexedDB` across `src/` returns nothing), and the maintainer has confirmed locking ships the same way. So progression is deliberately session-scoped: on every app entry the first playlist is unlocked and the other two are locked again, regardless of what was finished before. This is the accepted behaviour, not a gap — it keeps one consistent rule for all progress state and leaves persistence as a separate future change that would fix percentages and locks together. The route guard matters more under this choice than it would with persistence, because a reload straight into `#/game/<locked-id>` is the one way to sidestep a reset lock.

**Presentation: settled — minimal.** A locked tile is dimmed and carries a lock badge in the existing badge slot; no "Finish X to unlock" copy. That keeps the catalogue free of display-order metadata, since nothing needs to name the prerequisite playlist.

**Suggested direction.** Extract the catalogue to a shared ordered module. Add `isUnlocked(playlistId)` to `useProgress`, returning true for the first entry and otherwise mirroring the previous entry's `completed`. Render a locked tile as a non-navigating element (not a `Link`) with reduced opacity and a "Locked" badge reusing the `.tileBadge` slot at `GameList.module.css:46-56` — note `.tile:hover` (`:17-19`) should not lift a locked tile. Guard `/game/:playlistId` in `Stage` with a redirect to `/gamelist` for a locked id. Extend `.artifacts/repro/game-list-repro.jsx` — it already seeds the real progress store and reads the rendered tiles, so the locked/unlocked assertions drop straight into it.

**Related.** #15 / PR #18 (the completeness store and the `completed` flag this builds on), #10 (where the game list tiles came from), #19 (open, also touches `Stage.tsx`'s guess-resolution chain — no direct overlap with this work).

### Assumptions

- **Classified as a feature request, not a bug** — the issue is written entirely as desired behaviour; nothing described as current is malfunctioning.
- **Unlocking is sequential and positional**, as written: playlist *N* unlocks when playlist *N-1* is complete. Completing a later playlist does not unlock anything out of order.
- **The catalogue array order in `GameList.tsx` is the progression order** — "Your favourites" first and always unlocked, then "00's Jazz", then "2010".
- **Lock state is derived from `completed`, not stored as an independent field.** The issue's "same store" requirement is read as *the progress store owns it*, which a derived accessor on `useProgress` satisfies without a second source of truth. Alternative (an explicit `locked` boolean) is noted above and rejected on desync risk.
- **A locked tile does not navigate at all** — rendered as a non-`Link` element rather than a `Link` with a click guard, so the browser never offers the URL.
- **The stage route is guarded too.** The hash router exposes `/game/:playlistId` directly, so tile-level gating alone is not a gate; a locked id redirects to `/gamelist`.
- **Unlocking inherits the stickiness of `completed`** — within a session, once a playlist unlocks it stays unlocked even if the playable track count later rises and the live percentage drops back under 80%.
- **No change to the completion rule itself** — the 80%-or-faultless-round definition from #15 is taken as given.

### Decisions (settled by maintainer)

- **No persistence.** Locking uses the existing in-memory store untouched; locked playlists reset on every app entry, matching how percentages already behave. `localStorage` is explicitly out of scope for this work.
- **Minimal locked-tile treatment.** Dim the locked tile and show a lock badge — no instructional text naming the playlist that unlocks it.

### Open questions

None — both previously open decisions are recorded above.

### Reproduction

Not applicable — feature request, nothing to reproduce. Current behaviour was verified instead, against the real components:

```bash
npm install && npm install --no-save jsdom
npx vite build --config .artifacts/repro/game-list.config.mjs
node .artifacts/repro/game-list-runner.mjs
```

Renders the real `GameList` with the real progress store seeded so that "Your favourites" is finished (badged "Complete", 90% guessed), "00's Jazz" is part-played (25%) and "2010" was never opened (0%). All three tiles render live `/game/:playlistId` hrefs — the finished first playlist does not gate the others, and the untouched third playlist is as reachable as the first. That is the gap this issue closes.
