// Proves the fix for issue #9: selecting a cover resolves the guess on its own,
// with no second gesture. A wrong pick pauses the preview and reveals the answer
// on the covers (correct green, picked red) before the stage moves on; the
// record area is reduced to a play/pause control.
//
// Reveal durations come from config.stub-reveal.ts (see auto-check.config.mjs),
// shortened but non-zero so the reveal window can be sampled while it is open.
import { render } from "solid-js/web";
import { Route, Router, Routes } from "solid-app-router";
import Hammer from "hammerjs";
import Stage from "../../src/Stage/Stage";
import ScoreBoard from "../../src/ScoreBoard/ScoreBoard";
import { GameContext, getStore } from "../../src/services/useGame";
import { PlayerContext } from "../../src/services/usePlayer";
import { STAGE_SIZE } from "../../src/config";

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

const settle = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

// settle() only drains microtasks; the reveal hops through setTimeout.
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
  const [{ guessCount }] = game;
  const player = playerStub();

  const location = { value: "/game/40" };
  const routerIntegration = {
    signal: [() => location, (next) => Object.assign(location, next)],
  };

  const dispose = render(
    () => (
      <PlayerContext.Provider value={player}>
        <GameContext.Provider value={game}>
          <Router source={routerIntegration}>
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

  const correctCover = () => root.querySelector("a.cover__correct");
  const wrongCover = () => covers().find((c) => c !== correctCover());
  const revealedWrong = () => [...root.querySelectorAll('a[class*="revealWrong"]')];
  const revealedCorrect = () =>
    [...root.querySelectorAll('a[class*="revealCorrect"]')];

  check(
    "no cover is marked before the player answers",
    revealedWrong().length === 0 && revealedCorrect().length === 0,
  );

  // 1. Tap a WRONG cover. That single gesture must resolve the guess.
  const pausesBefore = player.calls.pause;
  const pickedWrong = wrongCover();
  const askedTrack = correctCover();
  gesture(pickedWrong, "tap");
  await settle();
  // Past COVER_ZOOM_DURATION, well short of REVEAL_DURATION: the reveal window
  // is open and the guess has not been banked yet.
  await sleep(50);
  await settle();

  const wrongMarked = revealedWrong();
  const correctMarked = revealedCorrect();

  check("the preview was paused on a wrong answer", player.calls.pause > pausesBefore);
  check(
    "exactly one cover is marked wrong and one correct during the reveal",
    wrongMarked.length === 1 && correctMarked.length === 1,
  );
  check(
    "the red border sits on the cover the player picked",
    wrongMarked[0] === pickedWrong,
  );
  check(
    "the green border sits on the cover that was the answer",
    correctMarked[0] === askedTrack,
  );
  check(
    "the two borders are on different covers",
    wrongMarked[0] !== correctMarked[0],
  );
  check(
    "the UI no longer asks for a swipe to check",
    !root.textContent.includes("Swipe up to check"),
  );

  // 2. After the reveal elapses the stage moves on, carrying no stale borders.
  await sleep(300);
  await settle();

  check(
    "selecting a wrong cover resolved the guess with no second gesture",
    guessCount() === 1,
  );
  check(
    "the reveal is cleared once the stage moves on",
    revealedWrong().length === 0 && revealedCorrect().length === 0,
  );
  check(
    "the stage still shows a full set of covers for the next question",
    covers().length === STAGE_SIZE,
  );
  check("the wrong answer consumed exactly one guess", guessCount() === 1);

  // 3. The record area is a play/pause control - it must not resolve anything.
  const recordArea = root.querySelector('[class*="playerControls"]');
  gesture(recordArea, "tap");
  await settle();
  await sleep();
  await settle();
  check(
    "tapping the record area does not record a guess",
    guessCount() === 1,
  );

  // 4. A correct pick resolves on the tap too, with no reveal borders.
  gesture(correctCover(), "tap");
  await settle();
  await sleep();
  await settle();

  check("selecting the correct cover resolved the guess", guessCount() === 2);
  check(
    "a correct answer shows no reveal borders",
    revealedWrong().length === 0 && revealedCorrect().length === 0,
  );

  dispose();

  const failures = checks.filter((c) => !c.pass).length;
  const output = [
    ...checks.map((c) => `  ${c.pass ? "PASS" : "FAIL"}  ${c.label}`),
    failures === 0
      ? "ALL CHECKS PASSED (cover selection checks the answer automatically)"
      : `${failures} CHECK(S) FAILED (guesses=${guessCount()})`,
  ].join("\n");

  return { output, failures };
}
