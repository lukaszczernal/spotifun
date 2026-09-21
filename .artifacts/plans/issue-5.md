# Plan — Issue #5: Hammer manager leak in `Cover.tsx`

## Goal

Every Hammer manager created by a `Cover` is destroyed when that cover unmounts, so a play session no longer accumulates gesture managers, detached DOM nodes, or `window` listeners. Done means: running `.artifacts/repro/cover-leak-runner.mjs` over 10 full-stage reshuffles reports **44 created / 44 destroyed** after dispose (currently 44 / 0), **10 window listeners** after dispose (currently 142), and `npx tsc --noEmit` reports **zero `src/` errors** (currently one).

## Scope

**In**

- `src/components/Cover/Cover.tsx` — store the manager, destroy it on cleanup; fix the `coverRef` definite-assignment error the change surfaces.
- `src/Splash/Splash.tsx` — same missing teardown, same one-line shape.
- `.artifacts/repro/cover-leak-runner.mjs` — turn the informational script into a pass/fail regression check.

**Out**

- Adding explicit `import Hammer from "hammerjs"` to `Cover.tsx` / `Splash.tsx`. See Assumption 3 — this actively breaks the regression harness.
- `reshuffleStage()` and the unkeyed `<For>` in `Stage.tsx`. Remounting all four covers per match is intended; the defect is the missing teardown, not the remount.
- `Stage.tsx:49-72`, which is already correct and is the pattern being copied.
- The stray `console.log` calls (`Cover.tsx:27`, `Stage.tsx:205`). Unrelated noise; separate change.
- Introducing a test runner. The repo has no test script; the existing `.artifacts/repro` harness is the established convention here (set by PR #4).

## Phase 1 — Fix `Cover.tsx`

**Change.** Replace the `onMount` / top-level `onCleanup` pair at `src/components/Cover/Cover.tsx:59-67`:

```ts
onMount(() => {
  if (!coverRef) {
    return;
  }
  const hammerCover = new Hammer(coverRef, {
    recognizers: [[Hammer.Tap]],
  });
  hammerCover.on("tap", onClickCallback);

  onCleanup(() => {
    hammerCover.destroy();
  });
});
```

Also widen the ref declaration at line 24 to `let coverRef: HTMLAnchorElement | undefined;`.

Two details that matter:

- `onCleanup` **nests inside** `onMount` so the manager stays in scope. Solid registers it against the owning component, so it still runs on unmount.
- It must be `hammerCover.destroy()`, not `.off()`. `.off()` only clears `manager.handlers`; only `destroy()` tears down the `Input` bindings that are actually leaking.

The `| undefined` + guard is what clears the pre-existing `TS2454` at the `ref={coverRef}` attribute — **not** the cleanup rewrite (correcting the triage note; see Assumption 1). It matches `Splash.tsx:13` and `Stage.tsx:46-47`, which already declare refs this way.

**Verify.**

```bash
npx tsc --noEmit 2>&1 | grep -v "^node_modules\|^  Try"   # expect no output
npx vite build                                            # expect success
```

## Phase 2 — Fix `Splash.tsx`

**Change.** `src/Splash/Splash.tsx:15-26` creates a manager in a `createEffect` with no teardown. Return a cleanup from the effect, exactly as `Stage.tsx:69-71` does:

```ts
createEffect(() => {
  if (!startRef) {
    return;
  }
  const hammerStart = new Hammer(startRef, {
    recognizers: [
      [Hammer.Swipe, { direction: Hammer.DIRECTION_UP }],
      [Hammer.Tap],
    ],
  });
  hammerStart.on('swipe tap', () => navigate('/gamelist'));

  return () => {
    hammerStart.destroy();
  };
});
```

Lower severity than Phase 1 — Splash mounts on navigation, not per round — but it is the identical defect, and leaving it keeps alive the pattern this work removes.

**Verify.** Same two commands as Phase 1, plus a manual pass: `npm run dev`, swipe up (and separately tap) on the splash screen — both must still navigate to `/gamelist`.

## Phase 3 — Lock it in with a regression assertion

**Change.** `.artifacts/repro/cover-leak-runner.mjs` currently prints numbers and always exits 0. Make it assert and exit non-zero on regression. Assert on the **post-dispose** snapshot, not `afterRounds`:

```js
const leakedAfterDispose = afterDispose.created - afterDispose.destroyed;
const failures = [];
if (leakedAfterDispose !== 0) {
  failures.push(`${leakedAfterDispose} Hammer managers survived dispose (expected 0)`);
}
if (afterDispose.winListeners > afterInitial.winListeners) {
  failures.push(
    `window listeners grew to ${afterDispose.winListeners} (expected <= ${afterInitial.winListeners})`,
  );
}
if (failures.length) {
  console.error("\nREGRESSION:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log("\nOK: every Hammer manager was destroyed.");
```

Use `afterDispose`, because `afterRounds` legitimately shows 4 undestroyed managers — the four covers still mounted at that moment. Asserting there would fail on correct code. Update the `LEAK CONFIRMED` line, which hardcodes the buggy framing and misreports the per-round figure (`11 per reshuffle round` for 10 rounds).

**Verify.**

```bash
npm install
npm install --no-save jsdom
npx vite build --config .artifacts/repro/cover-leak.config.mjs
node .artifacts/repro/cover-leak-runner.mjs; echo "exit=$?"
```

Expect `managers created: 44 / destroyed: 44`, `window: 10`, `exit=0`. To confirm the check actually bites, revert Phase 1, re-run (expect `exit=1`, 44 leaked), then re-apply.

## Phase 4 — End-to-end check

`npm run dev`, play a round, match a song, let the record-slide animation finish. Confirm: all four covers still swap, the new preview plays, tapping a cover still registers a guess, and the fade-in still runs. This is the behavior PR #4 added — the fix must not disturb it. Watch for a cover that stops responding to taps, which would signal teardown firing on a live manager.

## Risks

- **Cleanup fires on the wrong owner.** If `onCleanup` were nested inside a `createEffect` rather than `onMount`, it would re-run per effect pass and destroy a live manager. Symptom: covers stop responding to taps after one reshuffle. Caught by Phase 4.
- **Double `destroy()`.** Hammer's `destroy()` is not guarded against a second call. Not reachable here (one manager, one cleanup), but avoid adding any other teardown path.
- **The guard silently disables gestures.** If `coverRef` were ever unset at `onMount`, covers would become untappable rather than erroring. In practice Solid assigns refs before `onMount`; Phase 4's tap check confirms it.
- **Harness drift.** The repro imports the real `src/components/Cover/Cover`, so it breaks if the props change — this is a feature (it tracks real code), but the executor must update it rather than delete it.
- **jsdom uses `PointerEventInput`; real touch devices use `TouchInput`.** Different bound events, identical leak mechanism — the missing `destroy()` is input-class independent. Phase 4 on a real device covers the gap.

## Assumptions

1. **Correction to triage.** The `TS2454` on `Cover.tsx` is reported at the `ref={coverRef}` attribute, not the `onCleanup` body. Triage said the cleanup rewrite alone resolves it; verified false — rewriting alone still errors. The `| undefined` + guard is what fixes it. Both are needed.
2. **Correction to triage.** `Hammer.off` was earlier called non-existent. It **does** exist as the static `removeEventListeners` helper (`hammer.js:232`, exported `:2575`) and is declared in `@types/hammerjs`, which is why the compiler never flagged it. Verified: `typeof Hammer.off === "function"`, `Hammer.off !== Manager.prototype.off`, arity 3. The conclusion is unchanged — it calls `removeEventListener("tap", …)`, a gesture name Hammer never binds as a DOM event, so it unbinds nothing — but the fix is not "call a method that exists."
3. **Keep the bare global `Hammer`; do not add an explicit import.** Tested directly: adding `import Hammer from "hammerjs"` to `Cover.tsx` makes the harness report `created: 0`, because it instruments `globalThis.Hammer` and the component would then close over the module binding. The fix still works, but the regression proof goes blind — the worst failure mode, since it fails silently and green. Cleaning up the import convention is worth doing as its own change, alongside updating the harness to instrument the module.
4. Chose nesting `onCleanup` inside `onMount` over a module-level `WeakMap` or a `createEffect` with a returned cleanup. It is the least machinery, keeps creation and teardown adjacent, and is idiomatic Solid. `Stage.tsx` uses the effect-with-returned-cleanup form because its manager depends on reactive state; `Cover`'s does not.
5. No test runner is added. `package.json` has no test script, and PR #4 established `.artifacts/repro/` scripts as this repo's verification convention. Introducing Vitest is a larger change that should not ride along on a leak fix.
6. `Splash.tsx` is in scope even though issue #5 names only `Cover.tsx` — identical defect, identical fix, and leaving it preserves the pattern being removed.
7. The unkeyed `<For>` is treated as correct. Remounting is intentional and the reveal animation depends on it.
8. Post-dispose figures are the success criterion; `afterRounds` counts four still-mounted covers that are not leaks.

## Open questions

None blocking. One maintainer call for follow-up scope: whether to fold the `hammerjs` import cleanup (with the matching harness update from Assumption 3) and the two stray `console.log` removals into this PR or track them separately. Planned as separate; they are unrelated to the leak.
