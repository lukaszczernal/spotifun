// Regression harness for issue #3 - "the whole stage should reshuffle".
//
// Drives the REAL useTrackStore against a stubbed playlist and asserts the
// behaviour the fix is supposed to deliver:
//
//   1. the initial stage holds exactly STAGE_SIZE covers
//   2. a correct match replaces EVERY cover, not just the matched one
//   3. a guessed track never comes back to the stage
//   4. the mystery track is always a cover currently on the stage
//   5. the number of playable rounds does not regress (pool is not burned 4x)
//
// Must be bundled for the browser before running - Solid's default Node
// resolution picks the server build, where createEffect never runs.
//
//   npx vite build --config .artifacts/repro/stage-behaviour.config.mjs
//   node .artifacts/repro/stage-behaviour-runner.mjs

import { createRoot } from "solid-js";
import useTrackStore from "../../src/services/useTrackStore";
import { STAGE_SIZE } from "../../src/config";

const out = [];
const log = (...a) => out.push(a.join(" "));

let failures = 0;
const assert = (label, condition, detail = "") => {
  if (condition) {
    log(`  PASS  ${label}`);
  } else {
    failures++;
    log(`  FAIL  ${label} ${detail}`);
  }
};

const tick = () => new Promise((r) => setTimeout(r, 0));
const ids = (stage) => stage.map((item) => item.track.id);

async function scenario(playlistSize) {
  log(`\n--- playlist of ${playlistSize} tracks ---`);

  return createRoot(async (dispose) => {
    const store = useTrackStore({ playlistId: String(playlistSize) });
    const { stageTracks, mysteryTrack, markAsPlayed, reshuffleStage } = store;

    await tick();
    await tick();

    assert(
      `initial stage holds ${STAGE_SIZE} covers`,
      stageTracks().length === STAGE_SIZE,
      `got ${stageTracks().length}`,
    );
    assert(
      "mystery track is on the stage",
      ids(stageTracks()).includes(mysteryTrack()?.track.id),
      `mystery=${mysteryTrack()?.track.id} stage=${ids(stageTracks())}`,
    );

    const guessedIds = [];
    let rounds = 0;
    let everyCoverChanged = true;
    let guessedReturned = false;
    let mysteryAlwaysOnStage = true;

    // Play until the stage can no longer be rebuilt.
    while (rounds < playlistSize + 5) {
      const before = ids(stageTracks());
      const mystery = mysteryTrack();
      if (!mystery) break;

      markAsPlayed(mystery.track);
      guessedIds.push(mystery.track.id);
      reshuffleStage();
      await tick();

      const after = ids(stageTracks());

      // Stage stopped changing -> pool exhausted, end of the game.
      if (after.join() === before.join()) break;
      rounds++;

      const overlap = after.filter((id) => before.includes(id));
      if (overlap.length > 0 && rounds <= playlistSize / STAGE_SIZE - 1) {
        // While fresh tracks are plentiful every cover must be new.
        everyCoverChanged = false;
        log(`        round ${rounds}: covers carried over ${overlap}`);
      }
      if (after.some((id) => guessedIds.includes(id))) guessedReturned = true;
      if (!after.includes(mysteryTrack()?.track.id)) mysteryAlwaysOnStage = false;
    }

    assert("every cover changes while fresh tracks last", everyCoverChanged);
    assert("a guessed track never returns to the stage", !guessedReturned);
    assert("mystery track stays on the stage", mysteryAlwaysOnStage);
    assert(
      "stage always full",
      stageTracks().length === STAGE_SIZE,
      `got ${stageTracks().length}`,
    );

    log(`  rounds played: ${rounds}, answered: ${guessedIds.length}`);
    dispose();
    return rounds;
  });
}

export async function run() {
  const results = {};
  for (const size of [10, 25, 50]) {
    results[size] = await scenario(size);
  }

  log("\n--- rounds per playlist size ---");
  Object.entries(results).forEach(([size, rounds]) => {
    log(`  ${size} tracks -> ${rounds} rounds`);
  });

  // A naive reshuffle (staged never released) burns 4 tracks per match and
  // yields roughly size/4 rounds. Recycling must do far better than that.
  Object.entries(results).forEach(([size, rounds]) => {
    const naive = Math.floor(Number(size) / STAGE_SIZE);
    assert(
      `${size}-track playlist beats the naive ceiling of ~${naive} rounds`,
      rounds > naive,
      `got ${rounds}`,
    );
  });

  log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}`);
  return { output: out.join("\n"), failures };
}
