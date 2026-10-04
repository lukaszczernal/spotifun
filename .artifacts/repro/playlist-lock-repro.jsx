// The playlists are a progression (issue #20): only the first one is open when
// the app starts, and finishing one opens the next. This check drives the real
// progress store, so the rule is proven against the shipped accessor rather
// than a copy of it.
import { createRoot } from "solid-js";
import { render } from "solid-js/web";
import { Route, Router, Routes } from "solid-app-router";
import Hammer from "hammerjs";
import { StageRoute } from "../../src/Stage";
import {
  ProgressContext,
  getStore as getProgressStore,
} from "../../src/services/useProgress";
import { GameContext, getStore as getGameStore } from "../../src/services/useGame";
import { PlayerContext } from "../../src/services/usePlayer";
import { PLAYLISTS } from "../../src/services/playlists";
import { ROUND_LENGTH } from "../../src/config";

const [FIRST, SECOND, THIRD] = PLAYLISTS;

export function storeChecks() {
  const checks = [];
  const check = (label, pass) => checks.push({ label, pass });

  createRoot((dispose) => {
    const [{ isUnlocked }, action] = getProgressStore();

    const open = () => PLAYLISTS.map((playlist) => isUnlocked(playlist.id));

    check(
      "a fresh session opens the first playlist and locks the rest",
      JSON.stringify(open()) === JSON.stringify([true, false, false]),
    );

    // Finish the first playlist the slow way: guess more than 80% of it.
    action.syncPlaylist(FIRST.id, 10);
    for (let id = 1; id <= 9; id++) action.recordGuess(FIRST.id, id);

    check(
      "guessing a playlist through opens the next one, and only the next one",
      JSON.stringify(open()) === JSON.stringify([true, true, false]),
    );

    // Finish the second one the other way the game allows: a faultless round.
    action.completeRound(SECOND.id, ROUND_LENGTH);

    check(
      "a faultless round opens the playlist after it too",
      JSON.stringify(open()) === JSON.stringify([true, true, true]),
    );

    // The first playlist comes back larger, dropping its share back under the
    // mark. Finishing is sticky, so what it opened has to stay open.
    action.syncPlaylist(FIRST.id, 100);

    check(
      "a playlist that grows after being finished does not re-lock the next one",
      isUnlocked(SECOND.id) === true,
    );

    check(
      "a playlist id outside the menu is never locked",
      isUnlocked("40") === true,
    );

    dispose();
  });

  return checks;
}

// Lets queued promise callbacks (the stage's track-store effects) run through.
const settle = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

const playerStub = () => ({
  state: () => "pause",
  source: () => undefined,
  play: () => {},
  pause: () => {},
  toggle: () => {},
  load: () => {},
  reset: () => {},
  continousPlay: () => false,
});

/**
 * Hiding a locked playlist in the menu is not a gate: the router gives every
 * playlist a url of its own, which can be typed in. These checks open those
 * urls directly, through the same route shape App.tsx declares.
 */
async function visit(playlistId, seed) {
  const root = document.createElement("div");
  document.body.appendChild(root);

  const location = { value: `/game/${playlistId}` };
  const routerIntegration = {
    signal: [() => location, (next) => Object.assign(location, next)],
  };

  const progress = getProgressStore();
  const [, progressAction] = progress;
  if (seed) seed(progressAction);

  const dispose = render(
    () => (
      <PlayerContext.Provider value={playerStub()}>
        <ProgressContext.Provider value={progress}>
          <GameContext.Provider value={getGameStore()}>
            <Router source={routerIntegration}>
              <Routes>
                <Route
                  path="/gamelist"
                  element={<div data-screen="gamelist" />}
                />
                <Route path="/game">
                  <Route path="/:playlistId" element={<StageRoute />} />
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

  const landed = {
    path: location.value,
    onGameList: !!root.querySelector('[data-screen="gamelist"]'),
    coverCount: root.querySelectorAll("a.cover").length,
  };

  dispose();
  root.remove();

  return landed;
}

export async function routeChecks() {
  globalThis.Hammer = Hammer;

  const checks = [];
  const check = (label, pass) => checks.push({ label, pass });

  const lockedByUrl = await visit(THIRD.id);
  check(
    "opening a locked playlist by its url sends the player back to the menu",
    lockedByUrl.path === "/gamelist" && lockedByUrl.onGameList,
  );
  check(
    "a locked playlist never deals a stage",
    lockedByUrl.coverCount === 0,
  );

  const firstPlaylist = await visit(FIRST.id);
  check(
    "the playlist that is open from the start plays",
    firstPlaylist.path === `/game/${FIRST.id}` && firstPlaylist.coverCount > 0,
  );

  const unlockedByPlaying = await visit(SECOND.id, (action) => {
    action.completeRound(FIRST.id, ROUND_LENGTH);
  });
  check(
    "a playlist opened by finishing the one before it plays",
    unlockedByPlaying.path === `/game/${SECOND.id}` &&
      unlockedByPlaying.coverCount > 0,
  );

  return checks;
}
