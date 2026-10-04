import { JSDOM } from "jsdom";

const dom = new JSDOM(
  `<!doctype html><html><body><div id="root"></div></body></html>`,
  { pretendToBeVisual: true },
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);

const { run } = await import("./out-correct-reveal/correct-reveal-bundle.mjs");
const { output, failures } = await run();
console.log(output);
process.exit(failures ? 1 : 0);
