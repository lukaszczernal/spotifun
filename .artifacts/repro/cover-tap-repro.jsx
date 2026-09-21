// Guards the fix for issue #5: destroying the Hammer manager on unmount must
// not break tap handling on the covers that are still mounted.
import { createSignal, For } from "solid-js";
import { render } from "solid-js/web";
import Hammer from "hammerjs";
import Cover from "../../src/components/Cover/Cover";

const STAGE_SIZE = 4;

const makeTrack = (id) => ({
  id,
  album: { coverBig: `https://example.test/${id}.jpg` },
});

const tap = (el) => {
  const rect = { clientX: 10, clientY: 10 };
  for (const [type, target] of [
    ["pointerdown", el],
    ["pointerup", window],
  ]) {
    const ev = document.createEvent("Event");
    ev.initEvent(type, true, true);
    Object.assign(ev, rect, { pointerType: "touch", button: 0, which: 1 });
    target.dispatchEvent(ev);
  }
};

export function run({ rounds }) {
  globalThis.Hammer = Hammer;

  const root = document.createElement("div");
  document.body.appendChild(root);

  let nextId = 0;
  const drawStage = () =>
    Array.from({ length: STAGE_SIZE }, () => makeTrack(`track-${nextId++}`));

  const [stage, setStage] = createSignal(drawStage());
  const clicks = [];

  const dispose = render(
    () => (
      <For each={stage()}>
        {(track, index) => (
          <Cover
            track={track}
            isSelected={false}
            isCorrect={false}
            position={index()}
            onClick={(clicked) => clicks.push(clicked.id)}
            onLoad={() => {}}
          />
        )}
      </For>
    ),
    root,
  );

  const tapAllCovers = () => {
    const before = clicks.length;
    root.querySelectorAll("a.cover").forEach(tap);
    return clicks.length - before;
  };

  const initialTaps = tapAllCovers();

  const perRound = [];
  for (let i = 0; i < rounds; i++) {
    setStage(drawStage());
    perRound.push(tapAllCovers());
  }

  // Taps must land on the tracks currently on stage, not on stale ones.
  const liveIds = new Set(stage().map((track) => track.id));
  const lastRoundIds = clicks.slice(-STAGE_SIZE);
  const staleHits = lastRoundIds.filter((id) => !liveIds.has(id)).length;

  dispose();

  const tapsAfterDispose = (() => {
    const before = clicks.length;
    root.querySelectorAll("a.cover").forEach(tap);
    return clicks.length - before;
  })();

  return {
    stageSize: STAGE_SIZE,
    rounds,
    initialTaps,
    perRound,
    staleHits,
    tapsAfterDispose,
    totalClicks: clicks.length,
  };
}
