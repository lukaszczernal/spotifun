// Renders the real GameList and reads the DOM a player would get, so the
// playlist menu is proven against the shipped component rather than a copy of
// its tiles array. GameList renders solid-app-router Links, so it has to run
// inside a Router - the same in-memory router source the stage-round check uses.
import { render } from "solid-js/web";
import { Router } from "solid-app-router";
import GameList from "../../src/GameList/GameList";

export function run() {
  const root = document.createElement("div");
  document.body.appendChild(root);

  const location = { value: "/gamelist" };
  const routerIntegration = {
    signal: [() => location, (next) => Object.assign(location, next)],
  };

  const dispose = render(
    () => (
      <Router source={routerIntegration}>
        <GameList />
      </Router>
    ),
    root,
  );

  // CSS module class names are hashed at build time (._tile_1w85g_8), so
  // selecting on `.tile` would silently match nothing and pass every count
  // assertion. Select the element the Link renders instead.
  const tiles = [...root.querySelectorAll("a")].map((tile) => {
    const image = tile.querySelector("img");
    const heading = tile.querySelector("h3");
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
    };
  });

  dispose();

  return { tiles };
}
