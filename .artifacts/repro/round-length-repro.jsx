// Regression guard for issue #7: a play session is a bounded round.
//
// Drives the real useTrackStore together with the real useGame store, mirroring
// what Stage.checkRecord does per answer: record the score, retire the question,
// reshuffle. Asserts the session stops at ROUND_LENGTH, and that pool
// exhaustion is reported rather than silently freezing the stage.
//
//   npx vite build --config .artifacts/repro/round-length.config.mjs
//   node .artifacts/repro/round-length-runner.mjs

import { createRoot } from "solid-js";
import useTrackStore from "../../src/services/useTrackStore";
import { getStore } from "../../src/services/useGame";
import { ROUND_LENGTH, STAGE_SIZE } from "../../src/config";

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

/**
 * Plays a whole session the way Stage does, and reports how it ended.
 * `answer` decides whether the player guesses each question correctly.
 */
const playSession = async (playlistSize, answer) => {
  const { stageTracks, mysteryTrack, markAsPlayed, reshuffleStage } = useTrackStore({
    playlistId: String(playlistSize),
  });
  const [{ guessCount, scoreCount, failsCount, isRoundOver }, { addScore }] = getStore();

  await tick();
  await tick();

  const stageFilled = stageTracks().length === STAGE_SIZE;
  let exhausted = false;

  // Hard stop well above ROUND_LENGTH so a missing limit shows up as a big number.
  for (let i = 0; i < playlistSize + 10; i++) {
    const asked = mysteryTrack();
    if (!asked) break;

    const correct = answer(i);
    // Capture the question before the stage advances, exactly as Stage does.
    const askedTrack = asked.track;
    const selectedTrack = correct ? askedTrack : { ...askedTrack, id: askedTrack.id + 1000 };

    addScore({ correctTrack: askedTrack, selectedTrack });
    markAsPlayed(askedTrack);
    const advanced = reshuffleStage();
    await tick();

    if (isRoundOver()) break;
    if (!advanced) {
      exhausted = true;
      break;
    }
  }

  return {
    stageFilled,
    exhausted,
    guesses: guessCount(),
    correct: scoreCount(),
    fails: failsCount(),
    over: isRoundOver(),
  };
};

export async function run() {
  await createRoot(async (dispose) => {
    log(`ROUND_LENGTH: ${ROUND_LENGTH}  stage size: ${STAGE_SIZE}`);

    // A 29 track playlist - the size quoted in the issue - played perfectly.
    const perfect = await playSession(29, () => true);
    log(
      `\n29 tracks, every answer correct -> guesses ${perfect.guesses} correct ${perfect.correct} fails ${perfect.fails}`,
    );
    assert("stage filled", perfect.stageFilled);
    assert(
      `session stops after exactly ${ROUND_LENGTH} guesses`,
      perfect.guesses === ROUND_LENGTH,
      `got ${perfect.guesses}`,
    );
    assert("the round reports itself over", perfect.over);
    assert("a perfect round scores every guess", perfect.correct === ROUND_LENGTH);
    assert("the playlist did not run out", !perfect.exhausted);

    // Every answer wrong: a miss must still consume a guess and advance.
    const hopeless = await playSession(29, () => false);
    log(
      `\n29 tracks, every answer wrong   -> guesses ${hopeless.guesses} correct ${hopeless.correct} fails ${hopeless.fails}`,
    );
    assert(
      `a round of misses also stops after ${ROUND_LENGTH} guesses`,
      hopeless.guesses === ROUND_LENGTH,
      `got ${hopeless.guesses} - a wrong answer must consume a guess`,
    );
    assert("every miss counted as a fail", hopeless.fails === ROUND_LENGTH);

    // Enough tracks to fill a stage, but not enough to ask 10 questions.
    const short = await playSession(6, () => true);
    log(
      `\n6 tracks, every answer correct  -> guesses ${short.guesses} exhausted ${short.exhausted}`,
    );
    assert(
      "a short playlist reports exhaustion instead of freezing",
      short.exhausted,
      `guesses ${short.guesses}`,
    );
    assert(
      "a short playlist ends before the full round",
      short.guesses > 0 && short.guesses < ROUND_LENGTH,
      `got ${short.guesses}`,
    );

    dispose();
  });

  log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}`);
  return { output: out.join("\n"), failures };
}
