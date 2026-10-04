// Renders the real GameList and reads the DOM a player would get, so the
// playlist menu is proven against the shipped component rather than a copy of
// its tiles array. GameList renders solid-app-router Links, so it has to run
// inside a Router - the same in-memory router source the stage-round check uses.
//
// The menu also reports how far each playlist has been played and which ones
// are still locked (issue #20), so the real progress store is provided too.
// The caller seeds it, which lets one bundle cover several sessions.
import { render } from "solid-js/web";
import { Router } from "solid-app-router";
import GameList from "../../src/GameList/GameList";
import {
  ProgressContext,
  getStore as getProgressStore,
} from "../../src/services/useProgress";

export function run(seed) {
  const root = document.createElement("div");
  document.body.appendChild(root);

  const location = { value: "/gamelist" };
  const routerIntegration = {
    signal: [() => location, (next) => Object.assign(location, next)],
  };

  const progress = getProgressStore();
  const [, progressAction] = progress;

  if (seed) seed(progressAction);

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
  // assertion. A locked tile is deliberately not a Link either, so selecting
  // anchors would make a wrongly-locked playlist look like a missing one -
  // read the tiles as the children of the grid instead.
  const tiles = [...root.firstElementChild.children].map((tile) => {
    const image = tile.querySelector("img");
    const heading = tile.querySelector("h3");
    const progressText = tile.querySelector("p");
    const badge = tile.querySelector("span");
    // Bundled covers inline as multi-hundred-KB base64 data URIs, which would
    // bury the runner's diagnostics. Only the shape of the source matters here.
    const imageSrc = image?.getAttribute("src") ?? null;
    return {
      locked: tile.tagName !== "A",
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
  root.remove();

  return { tiles };
}
