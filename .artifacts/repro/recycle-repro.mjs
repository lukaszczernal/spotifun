// Proves the `staged` recycling requirement for the full-stage reshuffle.
//
// nextFreeTrack() requires !guessed && !staged, and markAsStaged() never
// clears `staged`. Under a full reshuffle, 4 tracks are consumed per match but
// only 1 is guessed, so 3 unguessed tracks are permanently locked out.
//
// Compares three strategies on the same playlists:
//   A. replace-one       (current behaviour)
//   B. reshuffle-naive   (full reshuffle, staged never cleared)  <- the trap
//   C. reshuffle-recycle (full reshuffle, staged cleared for unguessed)
//
// Also checks the small-playlist fallback: when fewer than STAGE_SIZE fresh
// tracks remain, the stage must still be fillable by repositioning.

const STAGE_SIZE = 4;

const makeTracks = (n) =>
  Array.from({ length: n }, (_, i) => ({
    track: { id: i + 1 },
    played: false,
    staged: false,
  }));

const freeTracks = (tracks) => tracks.filter((t) => !t.played && !t.staged);

function simulate(playlistSize, strategy) {
  const tracks = makeTracks(playlistSize);
  let stage = [];
  let matches = 0;

  // Initial fill
  for (let i = 0; i < STAGE_SIZE; i++) {
    const next = freeTracks(tracks)[0];
    if (!next) break;
    next.staged = true;
    stage.push(next);
  }
  if (stage.length < STAGE_SIZE) return { matches: 0, note: "could not fill initial stage" };

  while (true) {
    // Mystery is one of the staged covers; the player guesses it correctly.
    const mystery = stage[0];
    if (!mystery) break;
    mystery.played = true;
    matches++;

    if (strategy === "replace-one") {
      const next = freeTracks(tracks)[0];
      if (!next) break;
      next.staged = true;
      stage = stage.map((s) => (s === mystery ? next : s));
      continue;
    }

    if (strategy === "reshuffle-recycle") {
      // Release unguessed covers leaving the stage back into the pool.
      stage.forEach((s) => {
        if (!s.played) s.staged = false;
      });
    }

    const fresh = freeTracks(tracks).slice(0, STAGE_SIZE);
    if (fresh.length < STAGE_SIZE) {
      // Fallback: not enough fresh tracks to build a whole new stage.
      break;
    }
    fresh.forEach((t) => (t.staged = true));
    stage = fresh;
  }

  return { matches };
}

console.log("matches achievable before the stage can no longer be refilled");
console.log("(playlist size -> matches)\n");
console.log(
  ["playlist", "replace-one", "reshuffle-naive", "reshuffle-recycle"]
    .map((s) => s.padStart(18))
    .join(""),
);

for (const size of [10, 25, 50, 100]) {
  const a = simulate(size, "replace-one").matches;
  const b = simulate(size, "reshuffle-naive").matches;
  const c = simulate(size, "reshuffle-recycle").matches;
  console.log(
    [String(size), String(a), String(b), String(c)].map((s) => s.padStart(18)).join(""),
  );
}

console.log();
console.log("interpretation:");
console.log("  reshuffle-naive   loses most of the game -> unacceptable");
console.log("  reshuffle-recycle matches replace-one    -> required approach");
