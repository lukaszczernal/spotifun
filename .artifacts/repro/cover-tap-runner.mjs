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
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);

const { run } = await import("./out-cover-tap/cover-tap-repro.mjs");

const result = run({ rounds: 10 });
console.log(JSON.stringify(result, null, 2));

const { stageSize, rounds, initialTaps, perRound, staleHits, tapsAfterDispose } =
  result;

console.log("\n--- assertions ---");
console.log(`taps registered on the initial stage: ${initialTaps} (expected ${stageSize})`);
console.log(`taps registered per reshuffle round: [${perRound.join(", ")}] (each expected ${stageSize})`);
console.log(`taps that hit a track no longer on stage: ${staleHits} (expected 0)`);
console.log(`taps registered after dispose: ${tapsAfterDispose} (expected 0)`);

const failures = [];

if (initialTaps !== stageSize) {
  failures.push(`initial stage registered ${initialTaps} taps, expected ${stageSize}`);
}

const deadRound = perRound.findIndex((count) => count !== stageSize);
if (deadRound !== -1) {
  failures.push(
    `round ${deadRound + 1} registered ${perRound[deadRound]} taps, expected ${stageSize} ` +
      `- destroy() is firing on a manager that is still mounted`,
  );
}

if (staleHits !== 0) {
  failures.push(`${staleHits} taps resolved to tracks that are no longer on stage`);
}

if (tapsAfterDispose !== 0) {
  failures.push(`${tapsAfterDispose} taps still registered after dispose`);
}

if (failures.length > 0) {
  console.error(
    "\nFAILED: cover tap handling regressed.\n" +
      failures.map((failure) => `  - ${failure}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  `\nOK: all ${stageSize} covers stayed tappable across ${rounds} reshuffles, and none responded after unmount.`,
);
