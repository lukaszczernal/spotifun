// Drives the real Stage component through a full round, so the round-length fix
// is proven against the shipped component rather than a copy of its logic.
// Covers are tapped and the record is swiped exactly the way a player does.
import { render } from "solid-js/web";
import { Route, Router, Routes } from "solid-app-router";
import Hammer from "hammerjs";
import Stage from "../../src/Stage/Stage";
import ScoreBoard from "../../src/ScoreBoard/ScoreBoard";
import { GameContext, getStore } from "../../src/services/useGame";
import { PlayerContext } from "../../src/services/usePlayer";
import { ROUND_LENGTH, STAGE_SIZE } from "../../src/config";

const gesture = (el, type) => {
  for (const [name, target] of [
    ["pointerdown", el],
    ["pointerup", window],
  ]) {
    const ev = document.createEvent("Event");
    ev.initEvent(name, true, true);
    Object.assign(ev, {
      clientX: 10,
      clientY: type === "swipe" ? -400 : 10,
      pointerType: "touch",
      button: 0,
      which: 1,
    });
    target.dispatchEvent(ev);
  }
};

// Lets queued promise callbacks (the record animation chain) run to completion.
const settle = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

// settle() only drains microtasks; the wrong-answer reveal hops through
// setTimeout (durations collapsed to 0 by config.stub.ts).
const sleep = (ms = 5) => new Promise((r) => setTimeout(r, ms));

const playerStub = () => {
  const calls = { play: 0, pause: 0 };
  return {
    calls,
    state: () => "pause",
    source: () => undefined,
    play: () => calls.play++,
    pause: () => calls.pause++,
    toggle: () => {},
    load: () => {},
    reset: () => {},
    continousPlay: () => false,
  };
};

export async function run() {
  globalThis.Hammer = Hammer;

  const checks = [];
  const check = (label, pass) => checks.push({ label, pass });

  const root = document.createElement("div");
  document.body.appendChild(root);

  const game = getStore();
  const [{ gameScore, guessCount, scoreCount, failsCount }] = game;
  const player = playerStub();

  // playlistId doubles as the stub playlist size.
  const location = { value: "/game/40" };
  const routerIntegration = {
    signal: [() => location, (next) => Object.assign(location, next)],
  };

  const dispose = render(
    () => (
      <PlayerContext.Provider value={player}>
        <GameContext.Provider value={game}>
          <Router source={routerIntegration}>
            {/* Real routes, so Stage reads the playlist id from useParams the
                way it does in the app, and navigate() actually swaps screens. */}
            <Routes>
              <Route path="/game">
                <Route path="/score" element={<ScoreBoard />} />
                <Route path="/:playlistId" element={<Stage />} />
              </Route>
            </Routes>
          </Router>
        </GameContext.Provider>
      </PlayerContext.Provider>
    ),
    root,
  );

  await settle();

  const covers = () => [...root.querySelectorAll("a.cover")];
  check("the stage rendered a full set of covers", covers().length === STAGE_SIZE);

  // The mystery track is whichever cover Stage marks correct.
  const correctCover = () => root.querySelector("a.cover__correct");

  const answer = async ({ correctly }) => {
    const all = covers();
    const right = correctCover();
    const target = correctly ? right : all.find((c) => c !== right);
    if (!target) return false;

    // Selecting a cover checks the answer on its own (issue #9) - no second
    // gesture. The wrong-answer path resolves through setTimeout, which
    // settle() does not drain, hence the sleep.
    gesture(target, "tap");
    await settle();
    await sleep();
    await settle();
    return true;
  };

  // Alternate hits and misses so both paths run through the real component.
  let answered = 0;
  let intendedCorrect = 0;
  for (let i = 0; i < ROUND_LENGTH + 5; i++) {
    if (location.value === "/game/score") break;
    const correctly = i % 3 !== 0;
    const ok = await answer({ correctly });
    if (!ok) break;
    answered++;
    if (correctly) intendedCorrect++;
  }

  check(
    `the round recorded exactly ${ROUND_LENGTH} guesses`,
    guessCount() === ROUND_LENGTH,
  );
  check(
    "no further answers were accepted once the round was over",
    answered === ROUND_LENGTH,
  );
  check(
    "every hit was scored and every miss was counted as a fail",
    scoreCount() === intendedCorrect &&
      failsCount() === ROUND_LENGTH - intendedCorrect,
  );
  check(
    "the player was sent to the score screen",
    location.value === "/game/score",
  );
  check(
    "a wrong guess moved on to the next song instead of replaying it",
    new Set(gameScore.answers.map((a) => a.correctTrack?.id)).size ===
      ROUND_LENGTH,
  );
  check(
    "each score kept the song the player was actually asked about",
    gameScore.answers.every((a) => a.correctTrack && a.selectedTrack),
  );

  await settle();
  const scoreRows = [...root.querySelectorAll('[class*="scoreBoard__response"]')];
  const tags = scoreRows.map((row) => row.textContent);
  check(
    `the score board listed all ${ROUND_LENGTH} songs`,
    scoreRows.length === ROUND_LENGTH,
  );
  check(
    "missed songs are shown as missed",
    tags.filter((t) => t.includes("Missed")).length ===
      ROUND_LENGTH - intendedCorrect,
  );

  dispose();

  const failures = checks.filter((c) => !c.pass).length;
  const output = [
    ...checks.map((c) => `  ${c.pass ? "PASS" : "FAIL"}  ${c.label}`),
    failures === 0
      ? "ALL CHECKS PASSED"
      : `${failures} CHECK(S) FAILED  (guesses=${guessCount()} score=${scoreCount()} fails=${failsCount()} route=${location.value})`,
  ].join("\n");

  return { output, failures };
}
