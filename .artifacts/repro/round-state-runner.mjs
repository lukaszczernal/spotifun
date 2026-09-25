import { JSDOM } from "jsdom";

const dom = new JSDOM(
  `<!doctype html><html><body><div id="root"></div></body></html>`,
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;

const { run } = await import("./out-round-state/round-state-bundle.mjs");
const { output, failures } = await run();
console.log(output);
process.exit(failures === 0 ? 0 : 1);
