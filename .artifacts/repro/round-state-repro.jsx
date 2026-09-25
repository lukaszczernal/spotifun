// Issue #7, phase 1: the game store owns the round boundary.
// Drives the real useGame store directly - no DOM, no animations.
//
//   npx vite build --config .artifacts/repro/round-state.config.mjs
//   node .artifacts/repro/round-state-runner.mjs

import { createRoot } from "solid-js";
import { getStore } from "../../src/services/useGame";
import { ROUND_LENGTH } from "../../src/config";

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

const track = (id) => ({
  id,
  name: `track-${id}`,
  previewUrl: `https://example.invalid/${id}.mp3`,
  artist: `artist-${id}`,
  album: {
    id,
    name: `album-${id}`,
    coverMedium: `https://example.invalid/${id}-m.jpg`,
    coverBig: `https://example.invalid/${id}-b.jpg`,
  },
});

// A hit records the same track twice; a miss records two different ones.
const hit = (id) => ({ correctTrack: track(id), selectedTrack: track(id) });
const miss = (id) => ({ correctTrack: track(id), selectedTrack: track(id + 100) });

export async function run() {
  createRoot((dispose) => {
    const [{ guessCount, scoreCount, failsCount, isRoundOver }, { addScore, resetGame }] =
      getStore();

    log(`ROUND_LENGTH: ${ROUND_LENGTH}`);
    assert("a fresh round is not over", !isRoundOver());
    assert("a fresh round has no guesses", guessCount() === 0);

    // Nine answers: six hits, three misses.
    for (let i = 1; i <= 6; i++) addScore(hit(i));
    for (let i = 7; i <= 9; i++) addScore(miss(i));

    log(`after 9 answers -> guesses ${guessCount()} correct ${scoreCount()} fails ${failsCount()}`);
    assert(`round is not over after ${ROUND_LENGTH - 1} guesses`, !isRoundOver());
    assert("six hits counted as correct", scoreCount() === 6);
    assert("three misses counted as fails", failsCount() === 3);

    // The tenth answer closes the round.
    addScore(hit(10));
    log(`after 10 answers -> guesses ${guessCount()} correct ${scoreCount()} fails ${failsCount()}`);
    assert(`round is over after ${ROUND_LENGTH} guesses`, isRoundOver());
    assert(`guess count is ${ROUND_LENGTH}`, guessCount() === ROUND_LENGTH);
    assert(
      "correct plus fails equals the round length",
      scoreCount() + failsCount() === ROUND_LENGTH,
    );

    // A late callback must not be able to append an eleventh answer.
    addScore(hit(11));
    assert(
      "an answer past the end of the round is ignored",
      guessCount() === ROUND_LENGTH,
      `got ${guessCount()}`,
    );

    resetGame();
    log(`after resetGame -> guesses ${guessCount()} correct ${scoreCount()}`);
    assert("resetGame clears the round", guessCount() === 0 && !isRoundOver());

    dispose();
  });

  log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}`);
  return { output: out.join("\n"), failures };
}
