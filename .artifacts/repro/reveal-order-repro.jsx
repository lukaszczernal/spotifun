// Covers start at `opacity: 0` (src/components/Cover/Cover.module.css).
// Stage.tsx reveals them via anime({ targets: '.cover', opacity: 1 }) inside a
// createEffect gated on stageTracks()[STAGE_SIZE - 1] !== undefined.
//
// Question: when the whole stage array is replaced at once, does that effect
// re-run, and does it run AFTER <For> swapped in the new DOM nodes?
// If it never re-runs, the new covers stay at opacity 0 -> blank stage.
import { createEffect, createMemo } from "solid-js";
import { createStore } from "solid-js/store";
import { render, For } from "solid-js/web";

const STAGE_SIZE = 4;
const mk = (id) => ({ track: { id, name: "t" + id }, played: false, staged: true });

const out = [];
const log = (...a) => out.push(a.join(" "));

const [store, setStore] = createStore({ stage: [] });
const stageTracks = createMemo(() => store.stage);

let effectRuns = 0;
const showCovers = () => {
  effectRuns++;
  const nodes = [...document.querySelectorAll(".cover")];
  nodes.forEach((n) => (n.style.opacity = "1"));
  log("  reveal run #" + effectRuns + " touched nodes:", JSON.stringify(nodes.map((n) => n.dataset.id)));
};

const root = document.getElementById("root");

render(
  () => (
    <section>
      <For each={stageTracks()}>
        {(item) => <a class="cover" data-id={item.track.id} style={{ opacity: 0 }} />}
      </For>
    </section>
  ),
  root,
);

createEffect(() => {
  if (stageTracks()[STAGE_SIZE - 1] !== undefined) {
    showCovers();
  }
});

const domState = () =>
  JSON.stringify(
    [...document.querySelectorAll(".cover")].map((n) => `${n.dataset.id}:${n.style.opacity || "0"}`),
  );

const tick = () => new Promise((r) => setTimeout(r, 0));

export async function run() {
  for (let i = 0; i < STAGE_SIZE; i++) {
    setStore("stage", i, mk(i + 1));
    setStore("stage", [...store.stage]);
  }
  await tick();
  log("after initial fill         :", domState());

  // Proposed change: replace the entire stage in one write.
  setStore("stage", [mk(11), mk(12), mk(13), mk(14)]);
  await tick();
  log("after whole-stage reshuffle:", domState());

  const allVisible = [...document.querySelectorAll(".cover")].every((n) => n.style.opacity === "1");
  log("");
  log("reveal effect total runs   : " + effectRuns);
  log("all covers visible after reshuffle = " + allVisible);
  log(
    allVisible
      ? "=> existing reveal effect suffices"
      : "=> MUST explicitly re-run showCovers() on reshuffle",
  );
  return out.join("\n");
}
