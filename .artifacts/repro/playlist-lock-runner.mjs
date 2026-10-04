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

const { storeChecks, routeChecks } = await import(
  "./out-playlist-lock/playlist-lock-bundle.mjs"
);

const checks = [...storeChecks(), ...(await routeChecks())];

console.log("--- assertions ---");
for (const { label, pass } of checks) {
  console.log(`${pass ? "ok  " : "FAIL"} ${label}`);
}

const failures = checks.filter((check) => !check.pass);

if (failures.length > 0) {
  console.error(
    "\nFAILED: the playlists are not gated as a progression.\n" +
      failures.map((failure) => `  - ${failure.label}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  `\nOK: only the first playlist is open to start with, finishing one opens ` +
    `the next, and a locked playlist cannot be reached by its url either.`,
);
