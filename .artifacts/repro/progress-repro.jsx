// Regression guard for issue #15: a playlist can be finished, and finishing it
// is reported.
//
// Drives the real progress store together with the real track store, mirroring
// what Stage.checkAnswer does per answer: record a correct guess against the
// playlist, retire the question, reshuffle. Asserts the share guessed is
// measured against the playable track count, that completion is reached both by
// guessing most of a playlist and by a faultless round, that a finished playlist
// stays finished, and that replaying a playlist asks about songs the player has
// not already got right.
//
//   npx vite build --config .artifacts/repro/progress.config.mjs
//   node .artifacts/repro/progress-runner.mjs

import { createRoot } from "solid-js";
import useTrackStore from "../../src/services/useTrackStore";
import { getStore as getProgressStore } from "../../src/services/useProgress";
import { getStore as getGameStore } from "../../src/services/useGame";
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
 * Plays a round the way Stage does, against a shared progress store so that
 * rounds accumulate. `answer` decides whether each question is guessed right.
 * Returns the songs that were asked about, so the harness can check which songs
 * a replay offers.
 */
const playRound = async (progress, playlistId, answer) => {
  const [{ guessedIds }, progressAction] = progress;
  const { stageTracks, mysteryTrack, trackCount, markAsPlayed, reshuffleStage } =
    useTrackStore({
      playlistId,
      guessedIds: () => guessedIds(playlistId),
    });
  const [{ scoreCount, isRoundOver }, { addScore }] = getGameStore();

  await tick();
  await tick();

  progressAction.syncPlaylist(playlistId, trackCount());

  const stageFilled = stageTracks().length === STAGE_SIZE;
  const asked = [];

  for (let i = 0; i < ROUND_LENGTH + 10; i++) {
    const question = mysteryTrack();
    if (!question) break;

    const askedTrack = question.track;
    const correct = answer(i, askedTrack);
    const selectedTrack = correct
      ? askedTrack
      : { ...askedTrack, id: askedTrack.id + 1000 };

    asked.push(askedTrack.id);
    addScore({ correctTrack: askedTrack, selectedTrack });
    if (correct) progressAction.recordGuess(playlistId, askedTrack.id);

    markAsPlayed(askedTrack);
    const advanced = reshuffleStage();
    await tick();

    if (isRoundOver() || !advanced) {
      progressAction.completeRound(playlistId, scoreCount());
      break;
    }
  }

  return { stageFilled, asked, correct: scoreCount() };
};

export async function run() {
  await createRoot(async (dispose) => {
    log(`ROUND_LENGTH: ${ROUND_LENGTH}  stage size: ${STAGE_SIZE}`);

    // A playlist with no progress yet reads as untouched, so the game list has
    // something to show for a playlist that has never been opened.
    const fresh = getProgressStore();
    log("\nA playlist that has never been played");
    assert("reads as 0% guessed", fresh[0].progressOf("12").percent === 0);
    assert("is not marked complete", !fresh[0].progressOf("12").completed);
    assert("has no guessed songs", fresh[0].guessedIds("12").length === 0);

    // A short playlist runs out of covers before the round is up - the stage
    // needs a full set of unseen tracks to move on. The guesses still count
    // towards the playlist, measured against the playable track count.
    const short = getProgressStore();
    const shortRound = await playRound(short, "12", () => true);
    const shortEntry = short[0].progressOf("12");
    log(
      `\n12 tracks, every answer correct -> guessed ${shortEntry.guessed.length}` +
        ` of ${shortEntry.playableCount} = ${shortEntry.percent}%`,
    );
    assert("stage filled", shortRound.stageFilled);
    assert(
      "the playable track count is the denominator",
      shortEntry.playableCount === 12,
      `got ${shortEntry.playableCount}`,
    );
    assert(
      "every correct guess is counted against the playlist",
      shortEntry.guessed.length === shortRound.correct,
      `${shortEntry.guessed.length} counted of ${shortRound.correct} correct`,
    );
    assert(
      "the share guessed matches the songs got right",
      shortEntry.percent ===
        Math.round((shortEntry.guessed.length / 12) * 100),
      `got ${shortEntry.percent}`,
    );
    assert(
      "a round cut short by a small playlist does not complete it",
      !shortEntry.completed && shortRound.correct < ROUND_LENGTH,
      `complete ${shortEntry.completed} after ${shortRound.correct} correct`,
    );

    // 30 tracks, a faultless round: 10 of 30 is only a third of the playlist, so
    // completion here can only have come from the perfect round rule.
    const flawless = getProgressStore();
    await playRound(flawless, "30", () => true);
    const flawlessEntry = flawless[0].progressOf("30");
    log(
      `\n30 tracks, a faultless round -> guessed ${flawlessEntry.guessed.length}` +
        ` of ${flawlessEntry.playableCount} = ${flawlessEntry.percent}%`,
    );
    assert(
      "a third of the playlist is well short of the share needed",
      flawlessEntry.percent < 80,
      `got ${flawlessEntry.percent}`,
    );
    assert(
      `a round of ${ROUND_LENGTH} out of ${ROUND_LENGTH} completes the playlist`,
      flawlessEntry.completed,
    );

    // 30 tracks played badly, round after round: completion is reached by
    // guessing most of the playlist rather than by a faultless round.
    const grind = getProgressStore();
    // Miss the first question of every round, so no round is ever faultless.
    const missFirst = (i) => i > 0;
    let rounds = 0;
    let beforeThreshold = null;
    while (!grind[0].progressOf("30").completed && rounds < 10) {
      beforeThreshold = grind[0].progressOf("30").percent;
      await playRound(grind, "30", missFirst);
      rounds++;
    }
    const grindEntry = grind[0].progressOf("30");
    log(
      `\n30 tracks, one miss per round -> ${rounds} rounds, guessed` +
        ` ${grindEntry.guessed.length} of ${grindEntry.playableCount} = ${grindEntry.percent}%`,
    );
    assert(
      "no round was faultless",
      rounds > 1,
      "completed too early to have been earned by share",
    );
    assert(
      "the playlist was still incomplete below the share needed",
      beforeThreshold !== null && beforeThreshold <= 80,
      `was ${beforeThreshold}% and already complete`,
    );
    assert(
      "guessing more than 80% completes the playlist",
      grindEntry.completed && grindEntry.percent > 80,
      `complete ${grindEntry.completed} at ${grindEntry.percent}%`,
    );
    assert(
      "distinct songs are counted, never more than the playlist holds",
      grindEntry.guessed.length <= grindEntry.playableCount &&
        new Set(grindEntry.guessed).size === grindEntry.guessed.length,
      `${grindEntry.guessed.length} of ${grindEntry.playableCount}`,
    );

    // A playlist that grows after being finished stays finished, and the share
    // is recalculated against the new size on the way back in.
    const grown = getProgressStore();
    await playRound(grown, "30", () => true);
    const percentBefore = grown[0].progressOf("30").percent;
    const completeBefore = grown[0].progressOf("30").completed;
    grown[1].syncPlaylist("30", 50);
    const grownEntry = grown[0].progressOf("30");
    log(
      `\nA finished 30 track playlist grown to 50 -> ${percentBefore}% became` +
        ` ${grownEntry.percent}%, complete ${grownEntry.completed}`,
    );
    assert("the playlist was complete to begin with", completeBefore);
    assert(
      "the share is recalculated against the new track count",
      grownEntry.percent === 20,
      `got ${grownEntry.percent}`,
    );
    assert("the playlist stays complete", grownEntry.completed);

    // The share rule is strict: a playlist is finished once more than 80% of it
    // has been guessed, so exactly 80% is not enough.
    const boundary = getProgressStore();
    boundary[1].syncPlaylist("40", 40);
    for (let id = 1; id <= 32; id++) boundary[1].recordGuess("40", id);
    // A copy: progressOf hands back the live entry, which would otherwise move
    // with the next guess.
    const atBoundary = { ...boundary[0].progressOf("40") };
    boundary[1].recordGuess("40", 33);
    const pastBoundary = boundary[0].progressOf("40");
    log(
      `\n40 tracks -> 32 guessed is ${atBoundary.percent}% (complete` +
        ` ${atBoundary.completed}), 33 is ${pastBoundary.percent}% (complete` +
        ` ${pastBoundary.completed})`,
    );
    assert(
      "exactly 80% guessed does not finish a playlist",
      atBoundary.percent === 80 && !atBoundary.completed,
      `${atBoundary.percent}% complete ${atBoundary.completed}`,
    );
    assert(
      "one song past 80% finishes it",
      pastBoundary.percent > 80 && pastBoundary.completed,
      `${pastBoundary.percent}% complete ${pastBoundary.completed}`,
    );

    // Replaying a playlist must move the player towards finishing it rather than
    // asking about songs already got right.
    const replay = getProgressStore();
    const first = await playRound(replay, "30", () => true);
    const second = await playRound(replay, "30", () => true);
    const repeated = second.asked.filter((id) => first.asked.includes(id));
    log(
      `\n30 tracks, replayed -> first round asked ${first.asked.length} songs,` +
        ` second round repeated ${repeated.length} of them`,
    );
    assert(
      "a replay never asks about a song already guessed right",
      repeated.length === 0,
      `repeated ${repeated.join(", ")}`,
    );
    assert(
      "two rounds leave twice as many songs guessed",
      replay[0].progressOf("30").guessed.length === ROUND_LENGTH * 2,
      `got ${replay[0].progressOf("30").guessed.length}`,
    );

    dispose();
  });

  log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}`);
  return { output: out.join("\n"), failures };
}
