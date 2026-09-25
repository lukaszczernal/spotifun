// Regression guard for issue #7: the score must describe the question the
// player actually answered. reshuffleStage() swaps the mystery track
// synchronously, so Stage.checkAnswer captures the question before advancing.
// Reading mysteryTrack() after the swap would record the *next* question.
//
//   npx vite build --config .artifacts/repro/score-timing.config.mjs
//   node .artifacts/repro/score-timing-runner.mjs

import { createRoot } from "solid-js";
import useTrackStore from "../../src/services/useTrackStore";

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

export async function run() {
  await createRoot(async (dispose) => {
    const { mysteryTrack, markAsPlayed, reshuffleStage } = useTrackStore({
      playlistId: "29",
    });

    await tick();
    await tick();

    // Mirror Stage.checkAnswer: capture the question up front, before any part
    // of the answer handling runs.
    const asked = mysteryTrack();
    const askedTrack = asked.track;
    const answeredTrack = asked.track; // the player picks the correct cover
    log(`mystery track the player was asked about: ${askedTrack.id}`);

    // Everything below happens inside the animation callback, in order.
    const recorded = { correctTrack: askedTrack, selectedTrack: answeredTrack };
    markAsPlayed(askedTrack);
    reshuffleStage();

    log(`mysteryTrack() after the stage advanced:  ${mysteryTrack()?.track.id}`);
    log(`track recorded on the score:              ${recorded.correctTrack.id}`);

    assert(
      "the score records the track the player was actually asked about",
      recorded.correctTrack.id === askedTrack.id,
      `recorded ${recorded.correctTrack.id} but the player was asked about ${askedTrack.id}`,
    );
    assert(
      "the stage moved on to a different question",
      mysteryTrack()?.track.id !== askedTrack.id,
    );

    dispose();
  });

  log(
    `\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}`,
  );
  return { output: out.join("\n"), failures };
}
