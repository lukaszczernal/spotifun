// Renders the real GameList and reads the DOM a player would get, so the
// playlist menu is proven against the shipped component rather than a copy of
// its tiles array. GameList renders solid-app-router Links, so it has to run
// inside a Router - the same in-memory router source the stage-round check uses.
//
// The menu also reports how far each playlist has been played, so the real
// progress store is provided too, seeded to look like a player who has finished
// one playlist and made a start on another.
import { render } from "solid-js/web";
import { Router } from "solid-app-router";
import GameList from "../../src/GameList/GameList";
import {
  ProgressContext,
  getStore as getProgressStore,
} from "../../src/services/useProgress";

export function run() {
  const root = document.createElement("div");
  document.body.appendChild(root);

  const location = { value: "/gamelist" };
  const routerIntegration = {
    signal: [() => location, (next) => Object.assign(location, next)],
  };

  const progress = getProgressStore();
  const [, progressAction] = progress;

  // "Your favourites": 8 of 10 songs guessed, which finishes it.
  progressAction.syncPlaylist("394652815", 10);
  for (let id = 1; id <= 9; id++) progressAction.recordGuess("394652815", id);
  // "00's Jazz": a quarter of the way through, nowhere near finished.
  progressAction.syncPlaylist("9010236822", 40);
  for (let id = 1; id <= 10; id++) progressAction.recordGuess("9010236822", id);
  // "2010" is deliberately left untouched - never opened.

  const dispose = render(
    () => (
      <ProgressContext.Provider value={progress}>
        <Router source={routerIntegration}>
          <GameList />
        </Router>
      </ProgressContext.Provider>
    ),
    root,
  );

  // CSS module class names are hashed at build time (._tile_1w85g_8), so
  // selecting on `.tile` would silently match nothing and pass every count
  // assertion. Select the element the Link renders instead.
  const tiles = [...root.querySelectorAll("a")].map((tile) => {
    const image = tile.querySelector("img");
    const heading = tile.querySelector("h3");
    const progressText = tile.querySelector("p");
    const badge = tile.querySelector("span");
    // Bundled covers inline as multi-hundred-KB base64 data URIs, which would
    // bury the runner's diagnostics. Only the shape of the source matters here.
    const imageSrc = image?.getAttribute("src") ?? null;
    return {
      href: tile.getAttribute("href"),
      title: heading?.textContent ?? null,
      imageSrc:
        imageSrc && imageSrc.length > 80
          ? `${imageSrc.slice(0, 80)}… (${imageSrc.length} chars)`
          : imageSrc,
      imageAlt: image?.getAttribute("alt") ?? null,
      progress: progressText?.textContent ?? null,
      badge: badge?.textContent ?? null,
    };
  });

  dispose();

  return { tiles };
}
