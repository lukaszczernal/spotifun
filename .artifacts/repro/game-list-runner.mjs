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

const FAVOURITES = "394652815";
const JAZZ = "9010236822";
const TWENTY_TEN = "67784289";

const guess = (action, playlistId, count) => {
  for (let id = 1; id <= count; id++) action.recordGuess(playlistId, id);
};

// The playlists are a progression: only the first one is open to start with,
// and finishing one opens the next (issue #20). Each scenario is a session at a
// different point in it, and says exactly what the menu should be offering.
const scenarios = [
  {
    name: "a fresh session",
    seed: () => {},
    expected: [
      {
        locked: false,
        href: `/game/${FAVOURITES}`,
        title: "Your favourites",
        progress: "0% guessed",
        badge: null,
      },
      {
        locked: true,
        href: null,
        title: "00's Jazz",
        progress: null,
        badge: "Locked",
      },
      {
        locked: true,
        href: null,
        title: "2010",
        progress: null,
        badge: "Locked",
      },
    ],
  },
  {
    name: "the first playlist finished",
    seed: (action) => {
      // "Your favourites": 9 of 10 songs guessed, which finishes it.
      action.syncPlaylist(FAVOURITES, 10);
      guess(action, FAVOURITES, 9);
      // "00's Jazz" is now open: a quarter through, nowhere near finished.
      action.syncPlaylist(JAZZ, 40);
      guess(action, JAZZ, 10);
      // "2010" is deliberately left untouched - never opened.
    },
    expected: [
      {
        locked: false,
        href: `/game/${FAVOURITES}`,
        title: "Your favourites",
        progress: "90% guessed",
        badge: "Complete",
      },
      {
        locked: false,
        href: `/game/${JAZZ}`,
        title: "00's Jazz",
        progress: "25% guessed",
        badge: null,
      },
      {
        locked: true,
        href: null,
        title: "2010",
        progress: null,
        badge: "Locked",
      },
    ],
  },
  {
    name: "the first two playlists finished",
    seed: (action) => {
      action.syncPlaylist(FAVOURITES, 10);
      guess(action, FAVOURITES, 9);
      // 33 of 40 clears the 80% mark, so "2010" opens up as well.
      action.syncPlaylist(JAZZ, 40);
      guess(action, JAZZ, 33);
    },
    expected: [
      {
        locked: false,
        href: `/game/${FAVOURITES}`,
        title: "Your favourites",
        progress: "90% guessed",
        badge: "Complete",
      },
      {
        locked: false,
        href: `/game/${JAZZ}`,
        title: "00's Jazz",
        progress: "83% guessed",
        badge: "Complete",
      },
      {
        locked: false,
        href: `/game/${TWENTY_TEN}`,
        title: "2010",
        progress: "0% guessed",
        badge: null,
      },
    ],
  },
];

const failures = [];

for (const { name, seed, expected } of scenarios) {
  const { tiles } = run(seed);

  console.log(`\n--- ${name} ---`);
  console.log(JSON.stringify(tiles, null, 2));

  const fail = (message) => failures.push(`${name}: ${message}`);

  if (tiles.length !== expected.length) {
    fail(
      `the game list rendered ${tiles.length} tiles, expected ` +
        `${expected.length} - a playlist was dropped, or added twice`,
    );
  }

  expected.forEach((want, index) => {
    const got = tiles[index];
    const where = `tile ${index + 1} (${want.title})`;
    if (!got) {
      fail(`no tile at position ${index + 1}, expected ${want.title}`);
      return;
    }
    if (got.locked !== want.locked) {
      fail(
        want.locked
          ? `${where} should be locked, but the menu offers it`
          : `${where} should be playable, but the menu has it locked`,
      );
    }
    if (got.href !== want.href) {
      fail(
        want.href
          ? `${where} links to ${got.href}, expected ${want.href}`
          : `${where} is locked but still carries a url (${got.href}) the ` +
            `player could follow`,
      );
    }
    if (got.title !== want.title) {
      fail(
        `${where} is titled ${JSON.stringify(got.title)}, expected ` +
          `${JSON.stringify(want.title)}`,
      );
    }
    if (got.progress !== want.progress) {
      fail(
        `${where} reports progress ${JSON.stringify(got.progress)}, expected ` +
          `${JSON.stringify(want.progress)}`,
      );
    }
    if (got.badge !== want.badge) {
      fail(
        `${where} shows badge ${JSON.stringify(got.badge)}, expected ` +
          `${JSON.stringify(want.badge)}`,
      );
    }
  });

  const titles = tiles.map((tile) => tile.title);
  const duplicates = titles.filter(
    (title, index) => titles.indexOf(title) !== index,
  );
  if (duplicates.length > 0) {
    fail(`duplicate playlist tiles: ${[...new Set(duplicates)].join(", ")}`);
  }

  tiles.forEach((tile, index) => {
    if (!tile.imageSrc) {
      fail(`tile ${index + 1} (${tile.title}) has no cover image source`);
    }
    if (tile.imageAlt !== tile.title) {
      fail(
        `tile ${index + 1} has alt ${JSON.stringify(tile.imageAlt)}, expected ` +
          `it to match its title ${JSON.stringify(tile.title)}`,
      );
    }
  });
}

if (failures.length > 0) {
  console.error(
    "\nFAILED: the game list is not offering the expected playlists.\n" +
      failures.map((failure) => `  - ${failure}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  `\nOK: the game list offers every playlist with a cover and a title ` +
    `matching its alt text. A playable one shows the share guessed and a badge ` +
    `once finished; a locked one is badged Locked and carries no url at all.`,
);
