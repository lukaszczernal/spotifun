// Acceptance check for issue #14: picking the CORRECT cover holds the reveal
// on screen until the player taps to continue.
//
// The record slide starts half a second late, stops half way into the cover,
// and the stage waits there showing the song title, the performer and a
// "tap to continue" prompt. Nothing advances until the tap: no guess banked,
// no covers swapped. The tap then finishes the slide and deals a new stage.
//
// Timelines are recorded rather than driven off rAF, so the shape of the
// record animation - when it starts, how far it travels, how many legs - can
// be read back.
import { render } from "solid-js/web";
import { Route, Router, Routes } from "solid-app-router";
import Hammer from "hammerjs";
import Stage from "../../src/Stage/Stage";
import ScoreBoard from "../../src/ScoreBoard/ScoreBoard";
import { GameContext, getStore } from "../../src/services/useGame";
import { PlayerContext } from "../../src/services/usePlayer";
import { STAGE_SIZE } from "../../src/config";
import { RECORD_SLIDE_DELAY } from "../../src/Stage/animations";
import { timelines, resetTimelines } from "./correct-reveal.stub-anime.js";

const gesture = (el) => {
  for (const [name, target] of [
    ["pointerdown", el],
    ["pointerup", window],
  ]) {
    const ev = document.createEvent("Event");
    ev.initEvent(name, true, true);
    Object.assign(ev, {
      clientX: 10,
      clientY: 10,
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
  const correctCover = () => root.querySelector("a.cover__correct");
  const coverIds = () => covers().map((c) => c.querySelector("img")?.src);

  check("the stage rendered a full set of covers", covers().length === STAGE_SIZE);

  const before = coverIds();

  // The stub playlist names track N "track-N" by "artist-N" and gives it the
  // cover ".../cover/N-big.jpg", so the answer the prompt should name can be
  // read off the correct cover before it is picked.
  const askedId = correctCover()
    ?.querySelector("img")
    ?.src?.match(/\/(\d+)-big\.jpg/)?.[1];

  resetTimelines();

  // Pick the correct cover.
  gesture(correctCover());
  await settle();

  const slide = timelines[timelines.length - 1];

  check(
    "picking the correct cover builds a record slide timeline",
    !!slide && slide.steps.length > 0,
  );

  // --- the hold ---

  const firstStep = slide?.steps?.[0] ?? {};
  check(
    "the record slide starts with a half second delay",
    (slide?.params?.delay ?? firstStep.delay ?? 0) >= RECORD_SLIDE_DELAY,
  );

  // Half way in, and parked there: one leg only, stopping short of the full
  // -100% travel that would carry the record all the way behind the cover.
  const steps = slide?.steps ?? [];
  const travel = parseFloat(steps[steps.length - 1]?.translateY);
  check(
    "the record stops half way into the cover",
    steps.length === 1 && travel < 0 && travel > -100,
  );

  const held = root.textContent;
  check(
    'a "tap to continue" message is shown while the record waits',
    held.toLowerCase().includes("tap to continue"),
  );
  check(
    "the prompt names the song and the performer",
    !!askedId &&
      held.includes(`track-${askedId}`) &&
      held.includes(`artist-${askedId}`),
  );

  // The stage must still be on the answered question until the player taps.
  check(
    "the guess is not banked until the player taps to continue",
    guessCount() === 0,
  );

  await sleep(30);
  await settle();

  check(
    "the covers do not change until the player taps to continue",
    JSON.stringify(coverIds()) === JSON.stringify(before),
  );

  // --- the tap ---

  const timelinesBefore = timelines.length;
  const playerArea = root.querySelector('[class*="playerControls"]');
  gesture(playerArea);
  await settle();
  await sleep(30);
  await settle();

  const finish = timelines[timelines.length - 1];
  const finishSteps = finish?.steps ?? [];
  check(
    "tapping to continue runs the rest of the record slide",
    timelines.length > timelinesBefore &&
      finishSteps[finishSteps.length - 1]?.translateY === "100%",
  );
  check("the guess is banked on the tap", guessCount() === 1);
  check(
    "the prompt is cleared once the stage moves on",
    !root.textContent.toLowerCase().includes("tap to continue"),
  );
  check(
    "the stage moved on to a fresh set of covers",
    covers().length === STAGE_SIZE &&
      JSON.stringify(coverIds()) !== JSON.stringify(before),
  );

  dispose();

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
    `  record slide on the pick: ${shape(slide)}`,
    `  record slide on the tap:  ${shape(finish)}`,
    `  guesses banked before the tap: 0 expected`,
    "",
    failures === 0
      ? "ALL CHECKS PASSED (a correct answer holds for a tap to continue)"
      : `${failures} CHECK(S) FAILED (guesses=${guessCount()})`,
  ].join("\n");

  return { output, failures };
}
