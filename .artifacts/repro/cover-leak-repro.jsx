// Renders the real Cover component through Solid and counts how many Hammer
// managers / DOM listeners survive a full-stage reshuffle.
import { createSignal, For } from "solid-js";
import { render } from "solid-js/web";
import Hammer from "hammerjs";
import Cover from "../../src/components/Cover/Cover";

const STAGE_SIZE = 4;

const makeTrack = (id) => ({
  id,
  album: { coverBig: `https://example.test/${id}.jpg` },
});

export function run({ rounds }) {
  // Cover.tsx reads a bare global `Hammer`, so mirror what hammerjs' UMD does
  // when Stage.tsx imports it.
  globalThis.Hammer = Hammer;

  // Count live Hammer managers by wrapping the constructor.
  let created = 0;
  let destroyed = 0;
  const managers = [];
  const NativeHammer = Hammer;
  const CountingHammer = function (el, opts) {
    created += 1;
    const manager = new NativeHammer(el, opts);
    managers.push(manager);
    const nativeDestroy = manager.destroy.bind(manager);
    manager.destroy = () => {
      destroyed += 1;
      return nativeDestroy();
    };
    return manager;
  };
  Object.assign(CountingHammer, NativeHammer);
  globalThis.Hammer = CountingHammer;

  // Count live listeners. A Hammer manager binds on the element it is attached
  // to (evEl / evTarget) and on the window (evWin).
  const listeners = new Map();
  const bump = (bucket, delta) =>
    listeners.set(bucket, (listeners.get(bucket) || 0) + delta);

  const EventTargetProto = window.EventTarget.prototype;
  const nativeAdd = EventTargetProto.addEventListener;
  const nativeRemove = EventTargetProto.removeEventListener;
  const bucketOf = (t) =>
    t === document ? "document" : t === window ? "window" : "element";

  // Wrap each registered listener so we can see how many still run per event.
  let listenerInvocations = 0;
  const wrapped = new WeakMap();
  EventTargetProto.addEventListener = function (type, fn, opts) {
    bump(bucketOf(this), 1);
    if (typeof fn === "function" && !wrapped.has(fn)) {
      wrapped.set(fn, function (ev) {
        listenerInvocations += 1;
        return fn.call(this, ev);
      });
    }
    return nativeAdd.call(this, type, wrapped.get(fn) || fn, opts);
  };
  EventTargetProto.removeEventListener = function (type, fn, opts) {
    bump(bucketOf(this), -1);
    return nativeRemove.call(this, type, wrapped.get(fn) || fn, opts);
  };

  const root = document.createElement("div");
  document.body.appendChild(root);

  let nextId = 0;
  const drawStage = () =>
    Array.from({ length: STAGE_SIZE }, () => makeTrack(`track-${nextId++}`));

  const [stage, setStage] = createSignal(drawStage());

  const dispose = render(
    () => (
      <For each={stage()}>
        {(track, index) => (
          <Cover
            track={track}
            isSelected={false}
            isCorrect={false}
            position={index()}
            onClick={() => {}}
            onLoad={() => {}}
          />
        )}
      </For>
    ),
    root,
  );

  const snapshot = () => ({
    created,
    destroyed,
    docListeners: listeners.get("document") || 0,
    winListeners: listeners.get("window") || 0,
    elementListeners: listeners.get("element") || 0,
  });

  const afterInitial = snapshot();

  for (let i = 0; i < rounds; i++) {
    // What reshuffleStage() does: every stage slot gets a brand new track.
    setStage(drawStage());
  }

  const afterRounds = snapshot();

  // Do the leaked managers still do work? Their window-bound input listeners
  // (mousemove/mouseup, touchmove/touchend) fire for every pointer event
  // anywhere on the page, not just on the cover they were attached to.
  // Hammer's input binds window-level move/up events (pointermove/pointerup
  // under PointerEventInput, mousemove/touchmove otherwise). Every leaked
  // manager keeps listening.
  let controlFired = 0;
  window.addEventListener("pointermove", () => {
    controlFired += 1;
  });
  listenerInvocations = 0;
  const move = document.createEvent("Event");
  move.initEvent("pointermove", true, true);
  window.dispatchEvent(move);
  const handlerCallsPerPointerEvent = listenerInvocations;
  const controlFiredCount = controlFired;

  dispose();
  const afterDispose = snapshot();

  EventTargetProto.addEventListener = nativeAdd;
  EventTargetProto.removeEventListener = nativeRemove;

  return {
    stageSize: STAGE_SIZE,
    rounds,
    afterInitial,
    afterRounds,
    afterDispose,
    handlerCallsPerPointerEvent,
    controlFiredCount,
    domCovers: root.querySelectorAll("a.cover").length,
  };
}
