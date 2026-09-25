import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "https://example.test/",
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
for (const key of Object.getOwnPropertyNames(dom.window)) {
  if (key in globalThis) continue;
  const value = dom.window[key];
  if (value === undefined) continue;
  try {
    globalThis[key] =
      typeof value === "function" && !/^[A-Z]/.test(key)
        ? value.bind(dom.window)
        : value;
  } catch {
    // read-only globals are fine to skip
  }
}
globalThis.self = dom.window;
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame =
  dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame =
  dom.window.cancelAnimationFrame.bind(dom.window);

const { run } = await import("./out-game-list/game-list-repro.mjs");

const { tiles } = run();
console.log(JSON.stringify(tiles, null, 2));

// The playlists the menu is expected to offer, in order. The existing tile is
// listed too: issue #10 asks for a playlist to be added to the choice, not to
// replace the one already there.
const expected = [
  { href: "/game/394652815", title: "Your favourites" },
  { href: "/game/9010236822", title: "00's Jazz" },
];

console.log("\n--- assertions ---");
console.log(`tiles rendered: ${tiles.length} (expected ${expected.length})`);
console.log(`hrefs: [${tiles.map((tile) => tile.href).join(", ")}]`);
console.log(`titles: [${tiles.map((tile) => tile.title).join(", ")}]`);

const failures = [];

if (tiles.length !== expected.length) {
  failures.push(
    `the game list rendered ${tiles.length} tiles, expected ${expected.length}` +
      ` - a playlist was dropped, or added twice`,
  );
}

expected.forEach((want, index) => {
  const got = tiles[index];
  if (!got) {
    failures.push(`no tile at position ${index + 1}, expected ${want.href}`);
    return;
  }
  if (got.href !== want.href) {
    failures.push(
      `tile ${index + 1} links to ${got.href}, expected ${want.href}`,
    );
  }
  if (got.title !== want.title) {
    failures.push(
      `tile ${index + 1} is titled ${JSON.stringify(got.title)}, expected ` +
        `${JSON.stringify(want.title)}`,
    );
  }
});

const hrefs = tiles.map((tile) => tile.href);
const duplicates = hrefs.filter((href, index) => hrefs.indexOf(href) !== index);
if (duplicates.length > 0) {
  failures.push(`duplicate playlist tiles: ${[...new Set(duplicates)].join(", ")}`);
}

tiles.forEach((tile, index) => {
  if (!tile.imageSrc) {
    failures.push(`tile ${index + 1} (${tile.href}) has no cover image source`);
  }
  if (tile.imageAlt !== tile.title) {
    failures.push(
      `tile ${index + 1} has alt ${JSON.stringify(tile.imageAlt)}, expected it ` +
        `to match its title ${JSON.stringify(tile.title)}`,
    );
  }
});

if (failures.length > 0) {
  console.error(
    "\nFAILED: the game list is not offering the expected playlists.\n" +
      failures.map((failure) => `  - ${failure}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  `\nOK: the game list offers ${tiles.length} distinct playlists, each with a ` +
    `cover and a title matching its alt text.`,
);
