// Acceptance check for issue #19, amending the hold shipped for issue #14:
// picking the CORRECT cover holds the reveal on screen without interrupting
// anything, until the player swipes up (or taps) to continue.
//
// The record does not move on the pick and the song keeps playing - the record
// stays where it was, still spinning, with the song title, the performer and a
// "swipe up to continue" prompt on screen. Nothing advances until the gesture:
// no guess banked, no covers swapped, no pause. The gesture then stops the
// music, runs the whole record slide and deals a new stage.
//
// Both gestures are exercised - swipe up is what the prompt advertises, tap is
// still supported - and must produce identical outcomes.
//
// Timelines are recorded rather than driven off rAF, so the shape of the
// record animation - whether it runs at all, how far it travels, how many legs
// - can be read back.
import { render } from "solid-js/web";
import { Route, Router, Routes } from "solid-app-router";
import Hammer from "hammerjs";
import Stage from "../../src/Stage/Stage";
import ScoreBoard from "../../src/ScoreBoard/ScoreBoard";
import { GameContext, getStore } from "../../src/services/useGame";
import { PlayerContext } from "../../src/services/usePlayer";
import {
  ProgressContext,
  getStore as getProgressStore,
} from "../../src/services/useProgress";
import { STAGE_SIZE } from "../../src/config";
import { timelines, resetTimelines } from "./correct-reveal.stub-anime.js";

// A tap is a pointer pair that never moves. A swipe starts in the same place
// but travels a long way up before lifting, through an intermediate move that
// gives Hammer the distance and velocity its DIRECTION_UP recognizer needs.
// The journey matters: a pointerdown and pointerup that merely share a far-off
// coordinate have zero delta and are recognised as a tap, which would let this
// harness pass without the swipe recognizer existing at all.
const point = (name, target, clientY) => {
  const ev = document.createEvent("Event");
  ev.initEvent(name, true, true);
  Object.assign(ev, {
    clientX: 10,
    clientY,
    pointerType: "touch",
    button: 0,
    which: 1,
  });
  target.dispatchEvent(ev);
};

const gesture = (el, type) => {
  point("pointerdown", el, 400);
  if (type === "swipe") {
    point("pointermove", window, 240);
    point("pointermove", window, 80);
    point("pointerup", window, 20);
  } else {
    point("pointerup", window, 400);
  }
};

const settle = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

const sleep = (ms = 5) => new Promise((r) => setTimeout(r, ms));

// Reports itself as playing, so the stage is in the state a real hold starts
// from: the preview running, the record spinning.
const playerStub = () => {
  const calls = { play: 0, pause: 0 };
  return {
    calls,
    state: () => "play",
    source: () => undefined,
    play: () => calls.play++,
    pause: () => calls.pause++,
    toggle: () => {},
    load: () => {},
    reset: () => {},
    continousPlay: () => false,
  };
};

// One full pass: pick the correct cover, inspect the hold, then release it with
// `releaseWith` ("swipe" or "tap"). Both passes must agree.
async function playThrough(releaseWith, check) {
  const label = (text) => `[${releaseWith}] ${text}`;

  const root = document.createElement("div");
  document.body.appendChild(root);

  const game = getStore();
  const [{ guessCount }] = game;
  const player = playerStub();
  const progress = getProgressStore();

  const location = { value: "/game/40" };
  const routerIntegration = {
    signal: [() => location, (next) => Object.assign(location, next)],
  };

  const dispose = render(
    () => (
      <PlayerContext.Provider value={player}>
        <ProgressContext.Provider value={progress}>
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
        </ProgressContext.Provider>
      </PlayerContext.Provider>
    ),
    root,
  );

  await settle();

  const covers = () => [...root.querySelectorAll("a.cover")];
  const correctCover = () => root.querySelector("a.cover__correct");
  const coverIds = () => covers().map((c) => c.querySelector("img")?.src);

  check(label("the stage rendered a full set of covers"), covers().length === STAGE_SIZE);

  const before = coverIds();

  // The stub playlist names track N "track-N" by "artist-N" and gives it the
  // cover ".../cover/N-big.jpg", so the answer the prompt should name can be
  // read off the correct cover before it is picked.
  const askedId = correctCover()
    ?.querySelector("img")
    ?.src?.match(/\/(\d+)-big\.jpg/)?.[1];

  resetTimelines();
  // Counted as a delta, not an absolute: anything that paused before the pick
  // would otherwise be charged to the hold.
  const pausesBeforePick = player.calls.pause;

  // Pick the correct cover.
  gesture(correctCover(), "tap");
  await settle();

  // --- the hold ---

  // The point of the issue: the record is left exactly where it was playing,
  // so the pick must not build a slide at all.
  check(
    label("picking the correct cover does not move the record"),
    timelines.length === 0,
  );

  check(
    label("the song keeps playing while the answer is held"),
    player.calls.pause - pausesBeforePick === 0,
  );

  const held = root.textContent;
  check(
    label('a "swipe up to continue" message is shown while the record plays on'),
    held.toLowerCase().includes("swipe up to continue"),
  );
  check(
    label("the prompt names the song and the performer"),
    !!askedId &&
      held.includes(`track-${askedId}`) &&
      held.includes(`artist-${askedId}`),
  );

  // The stage must still be on the answered question until the player acts.
  check(
    label("the guess is not banked until the player continues"),
    guessCount() === 0,
  );

  await sleep(30);
  await settle();

  check(
    label("the covers do not change until the player continues"),
    JSON.stringify(coverIds()) === JSON.stringify(before),
  );
  check(
    label("the record still has not moved after waiting"),
    timelines.length === 0,
  );

  // --- the gesture ---

  const pausesBeforeRelease = player.calls.pause;
  const playerArea = root.querySelector('[class*="playerControls"]');
  gesture(playerArea, releaseWith);
  await settle();
  await sleep(30);
  await settle();

  const finish = timelines[timelines.length - 1];
  const finishSteps = finish?.steps ?? [];
  check(
    label("continuing runs the record slide, all the way home"),
    timelines.length === 1 &&
      finishSteps[finishSteps.length - 1]?.translateY === "100%",
  );
  check(
    label("continuing stops the music"),
    player.calls.pause - pausesBeforeRelease === 1,
  );
  check(label("the guess is banked on the gesture"), guessCount() === 1);
  check(
    label("the prompt is cleared once the stage moves on"),
    !root.textContent.toLowerCase().includes("swipe up to continue"),
  );
  check(
    label("the stage moved on to a fresh set of covers"),
    covers().length === STAGE_SIZE &&
      JSON.stringify(coverIds()) !== JSON.stringify(before),
  );

  dispose();
  root.remove();

  return { finish, guesses: guessCount() };
}

export async function run() {
  globalThis.Hammer = Hammer;

  const checks = [];
  const check = (label, pass) => checks.push({ label, pass });

  const swiped = await playThrough("swipe", check);
  const tapped = await playThrough("tap", check);

  const failures = checks.filter((c) => !c.pass).length;
  const shape = (timeline) =>
    (timeline?.steps ?? [])
      .map(
        (s) =>
          `translateY=${s.translateY} duration=${s.duration} delay=${s.delay ?? 0}`,
      )
      .join(" | ") || "(none)";

  const output = [
    ...checks.map((c) => `  ${c.pass ? "PASS" : "FAIL"}  ${c.label}`),
    "",
    `  record slide on the pick:   (none) expected, both passes`,
    `  record slide on the swipe:  ${shape(swiped.finish)}`,
    `  record slide on the tap:    ${shape(tapped.finish)}`,
    "",
    failures === 0
      ? "ALL CHECKS PASSED (a correct answer plays on until a swipe or a tap continues)"
      : `${failures} CHECK(S) FAILED`,
  ].join("\n");

  return { output, failures };
}
