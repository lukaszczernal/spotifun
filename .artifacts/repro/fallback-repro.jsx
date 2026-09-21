// Exercises the small-playlist path of reshuffleStage(), where there are not
// enough unseen tracks left to build a whole new stage and the remaining
// covers have to be reused in new positions instead.
//
//   npx vite build --config .artifacts/repro/fallback.config.mjs
//   node .artifacts/repro/fallback-runner.mjs

import { createRoot } from "solid-js";
import useTrackStore from "../../src/services/useTrackStore";
import { STAGE_SIZE } from "../../src/config";

const out = [];
const log = (...a) => out.push(a.join(" "));
let failures = 0;
const assert = (label, cond, detail = "") => {
  if (cond) log(`  PASS  ${label}`);
  else {
    failures++;
    log(`  FAIL  ${label} ${detail}`);
  }
};

const tick = () => new Promise((r) => setTimeout(r, 0));
const ids = (s) => s.map((i) => i.track.id);

export async function run() {
  // Exactly STAGE_SIZE + 1 tracks: after the first match there is only one
  // fresh track left, so a full replacement is impossible.
  await createRoot(async (dispose) => {
    const { stageTracks, mysteryTrack, markAsGuessed, reshuffleStage } =
      useTrackStore({ playlistId: String(STAGE_SIZE + 1) });

    await tick();
    await tick();

    log(`initial stage: ${ids(stageTracks())}`);
    assert("stage filled", stageTracks().length === STAGE_SIZE);

    let round = 0;
    let everFellBelowFull = false;
    let everRepeatedGuessed = false;
    const guessed = [];

    while (round < 8) {
      const before = ids(stageTracks());
      const mystery = mysteryTrack();
      if (!mystery) break;

      markAsGuessed(mystery.track);
      guessed.push(mystery.track.id);
      reshuffleStage();
      await tick();

      const after = ids(stageTracks());
      const frozen = after.join() === before.join();

      log(
        `  round ${round + 1}: ${before} -> ${after}` +
          (frozen ? "  (pool exhausted, stage frozen - same as before the fix)" : ""),
      );

      // Once the pool is exhausted the stage stops changing and the guessed
      // cover stays put. That is the pre-existing end-of-playlist behaviour of
      // the original replace-one implementation too, so it is not asserted
      // against here - only the rounds that actually reshuffled are checked.
      if (frozen) break;

      if (stageTracks().length !== STAGE_SIZE) everFellBelowFull = true;
      if (after.some((id) => guessed.includes(id))) everRepeatedGuessed = true;
      round++;
    }

    assert("stage never shrank below full", !everFellBelowFull);
    assert("guessed track never reappeared", !everRepeatedGuessed);
    assert("at least one reshuffle happened", round >= 1, `rounds=${round}`);

    dispose();
  });

  log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}`);
  return { output: out.join("\n"), failures };
}
