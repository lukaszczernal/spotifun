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
// Hoist every DOM constructor / helper jsdom exposes, so animejs and hammerjs
// find the globals they expect.
for (const key of Object.getOwnPropertyNames(dom.window)) {
  if (key in globalThis) continue;
  const value = dom.window[key];
  if (value === undefined) continue;
  try {
    globalThis[key] = typeof value === "function" && !/^[A-Z]/.test(key)
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

const { run } = await import("./out-cover-leak/cover-leak-repro.mjs");

const result = run({ rounds: 10 });
console.log(JSON.stringify(result, null, 2));

const { afterInitial, afterRounds, afterDispose, rounds, stageSize } = result;

const expectedCreated = stageSize * (rounds + 1);
// Assert on the post-dispose snapshot. `afterRounds` legitimately shows the
// STAGE_SIZE covers that are still mounted at that point, so it is not a leak
// figure; only once everything is unmounted should the counts balance.
const leakedAfterDispose = afterDispose.created - afterDispose.destroyed;

console.log("\n--- assertions ---");
console.log(
  `managers created: ${afterDispose.created} (expected ${expectedCreated} = STAGE_SIZE x (1 initial + ${rounds} reshuffles))`,
);
console.log(`managers destroyed: ${afterDispose.destroyed}`);
console.log(`managers still alive after dispose: ${leakedAfterDispose}`);
console.log(
  `listeners still bound after unmounting everything - window: ${afterDispose.winListeners}, document: ${afterDispose.docListeners}, element: ${afterDispose.elementListeners}`,
);
console.log(`covers left in the DOM after dispose: ${result.domCovers}`);
console.log(
  `input handlers invoked per single window pointer event: ${result.handlerCallsPerPointerEvent}`,
);

const failures = [];

if (leakedAfterDispose !== 0) {
  failures.push(
    `${leakedAfterDispose} Hammer managers survived dispose (expected 0) - ` +
      `${leakedAfterDispose / stageSize} per reshuffle round x ${stageSize} covers`,
  );
}

if (afterDispose.winListeners > afterInitial.winListeners) {
  failures.push(
    `window listeners grew to ${afterDispose.winListeners} (expected <= ${afterInitial.winListeners})`,
  );
}

if (failures.length > 0) {
  console.error(
    "\nREGRESSION: Cover is leaking Hammer managers again.\n" +
      failures.map((failure) => `  - ${failure}`).join("\n"),
  );
  process.exit(1);
}

console.log("\nOK: every Hammer manager created was destroyed on unmount.");
