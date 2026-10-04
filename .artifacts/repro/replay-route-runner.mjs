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


const { screenAt, replayHref } = await import(
  "./out-replay-route/replay-route-repro.mjs"
);

const failures = [];
const assert = (label, condition, detail = "") => {
  if (condition) console.log(`  PASS  ${label}`);
  else {
    failures.push(`${label} ${detail}`);
    console.log(`  FAIL  ${label} ${detail}`);
  }
};

console.log("--- where each path leads ---");
for (const path of ["/game", "/gamelist", "/game/9010236822", "/game/score"]) {
  console.log(`${path} -> ${screenAt(path)}`);
}

const playlistId = "9010236822";
const afterRound = replayHref(playlistId);
const afterReload = replayHref(null);

console.log("\n--- assertions ---");
console.log(`after a round on ${playlistId}: "One more round" -> ${afterRound}`);
console.log(`after a reload (no playlist known): -> ${afterReload}`);

assert(
  "another round starts on the playlist just played",
  afterRound === `/game/${playlistId}`,
  `got ${afterRound}`,
);
assert(
  "that link lands the player on a stage, not the splash screen",
  screenAt(afterRound) === "stage",
  `got ${screenAt(afterRound)}`,
);
assert(
  "with no playlist known the player is offered the menu instead",
  afterReload === "/gamelist",
  `got ${afterReload}`,
);
assert(
  "and that link lands on the game list",
  screenAt(afterReload) === "gamelist",
  `got ${screenAt(afterReload)}`,
);

if (failures.length > 0) {
  console.error(
    `\nFAILED: a player cannot reliably get back into the playlist they were ` +
      `playing, so progress cannot accumulate.`,
  );
  process.exit(1);
}

console.log(
  "\nOK: finishing a round offers another round of the same playlist, " +
    "falling back to the menu when the playlist is not known.",
);
