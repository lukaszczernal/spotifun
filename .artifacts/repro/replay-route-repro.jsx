// Regression guard for issue #15: per-playlist progress only accumulates if a
// player can get back into the same playlist. ScoreBoard's "One more round"
// button used to point at "/game", which drops the player on the splash screen
// and loses the playlist they were playing.
//
// Renders the real ScoreBoard against the real game store and reports where its
// button leads, then resolves that link through the real route table from
// App.tsx to prove which screen the player lands on.
import { render } from "solid-js/web";
import { Router, Routes, Route } from "solid-app-router";
import ScoreBoard from "../../src/ScoreBoard/ScoreBoard";
import { GameContext, getStore as getGameStore } from "../../src/services/useGame";

const Marker = (props) => <div data-screen={props.name} />;

/** Which screen App.tsx's route table serves for a path. */
export function screenAt(path) {
  const root = document.createElement("div");
  document.body.appendChild(root);

  const location = { value: path };
  const routerIntegration = {
    signal: [() => location, (next) => Object.assign(location, next)],
  };

  const dispose = render(
    () => (
      <Router source={routerIntegration}>
        <Routes>
          <Route path="/gamelist" element={<Marker name="gamelist" />} />
          <Route path="/game">
            <Route path="/score" element={<Marker name="scoreboard" />} />
            <Route path="/:playlistId" element={<Marker name="stage" />} />
          </Route>
          <Route path="/*" element={<Marker name="splash" />} />
        </Routes>
      </Router>
    ),
    root,
  );

  const screen =
    root.querySelector("[data-screen]")?.getAttribute("data-screen") ?? null;

  dispose();
  return screen;
}

/**
 * Renders the real ScoreBoard after a round on `playlistId` and returns where
 * its "One more round" button points. Passing no playlist stands in for a
 * reload, which lands on the score board with an empty game store.
 */
export function replayHref(playlistId) {
  const root = document.createElement("div");
  document.body.appendChild(root);

  const location = { value: "/game/score" };
  const routerIntegration = {
    signal: [() => location, (next) => Object.assign(location, next)],
  };

  const game = getGameStore();
  const [, { addScore, setPlaylistId }] = game;

  if (playlistId) {
    setPlaylistId(playlistId);
    const track = {
      id: 1,
      name: "track-1",
      previewUrl: "https://example.invalid/preview/1.mp3",
      artist: "artist-1",
      album: {
        id: 1,
        name: "album-1",
        coverMedium: "https://example.invalid/cover/1-medium.jpg",
        coverBig: "https://example.invalid/cover/1-big.jpg",
      },
    };
    addScore({ correctTrack: track, selectedTrack: track });
  }

  const dispose = render(
    () => (
      <GameContext.Provider value={game}>
        <Router source={routerIntegration}>
          <ScoreBoard />
        </Router>
      </GameContext.Provider>
    ),
    root,
  );

  // The footer button is the only link on the score board.
  const href = root.querySelector("a")?.getAttribute("href") ?? null;

  dispose();
  return href;
}
