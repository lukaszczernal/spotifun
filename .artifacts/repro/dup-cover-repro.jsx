// Reproduction for issue #13 - "Repeated album covers on a stage".
//
// Drives the REAL useTrackStore against a playlist where several tracks share
// an album (exactly what Deezer returns) and reports how often a single stage
// of STAGE_SIZE covers shows the same cover image twice.
//
//   npx vite build --config .artifacts/repro/dup-cover.config.mjs
//   node .artifacts/repro/dup-cover-runner.mjs

import { createRoot } from "solid-js";
import useTrackStore from "../../src/services/useTrackStore";
import { STAGE_SIZE } from "../../src/config";

const out = [];
const log = (...a) => out.push(a.join(" "));

let failures = 0;
const assert = (label, condition, detail = "") => {
  if (condition) log(`  PASS  ${label}`);
  else {
    failures++;
    log(`  FAIL  ${label} ${detail}`);
  }
};

const tick = () => new Promise((r) => setTimeout(r, 0));
const covers = (stage) => stage.map((i) => i.track.album.coverBig);

async function playRound(playlistId) {
  return createRoot(async (dispose) => {
    const { stageTracks, mysteryTrack, markAsPlayed, reshuffleStage } =
      useTrackStore({ playlistId });

    await tick();
    await tick();

    let stages = 0;
    let dupStages = 0;
    let ambiguousGuesses = 0;
    const samples = [];

    for (let r = 0; r < 10; r++) {
      const stage = stageTracks();
      const mystery = mysteryTrack();
      if (!mystery || stage.length < STAGE_SIZE) break;

      const urls = covers(stage);
      stages++;
      if (new Set(urls).size < urls.length) {
        dupStages++;
        if (samples.length < 3)
          samples.push(stage.map((i) => i.track.album.name).join(", "));
        // The mystery track's own cover is on the stage twice -> the player
        // cannot tell which of the two identical covers is the answer.
        const mysteryUrl = mystery.track.album.coverBig;
        if (urls.filter((u) => u === mysteryUrl).length > 1) ambiguousGuesses++;
      }

      markAsPlayed(mystery.track);
      if (!reshuffleStage()) break;
      await tick();
    }

    dispose();
    return { stages, dupStages, ambiguousGuesses, samples };
  });
}

export async function run() {
  // 40 tracks, 2 per album -> the mild case. 40 tracks, 3 per album -> close
  // to the "00's Jazz" playlist shipped on the game list.
  for (const playlistId of ["40x1", "40x2", "40x3"]) {
    const perAlbum = playlistId.split("x")[1];
    log(`\n--- 40 tracks, ${perAlbum} track(s) per album ---`);

    let stages = 0;
    let dupStages = 0;
    let ambiguous = 0;
    let shown = false;
    for (let run = 0; run < 200; run++) {
      const r = await playRound(playlistId);
      stages += r.stages;
      dupStages += r.dupStages;
      ambiguous += r.ambiguousGuesses;
      if (!shown && r.samples.length) {
        log(`  example stage with a repeated cover: ${r.samples[0]}`);
        shown = true;
      }
    }

    const pct = ((100 * dupStages) / stages).toFixed(1);
    log(`  stages rendered: ${stages}`);
    log(`  stages showing the same cover twice: ${dupStages} (${pct}%)`);
    log(`  of those, unanswerable (mystery album duplicated): ${ambiguous}`);

    if (perAlbum === "1") {
      assert(
        "distinct albums never repeat a cover",
        dupStages === 0,
        `got ${dupStages}`,
      );
    } else {
      // This is the bug: with the current code this assertion FAILS.
      assert(
        `no stage repeats a cover when ${perAlbum} tracks share an album`,
        dupStages === 0,
        `got ${dupStages} of ${stages} stages (${pct}%)`,
      );
    }
  }

  log(
    `\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED - issue #13 reproduced"}`,
  );
  return { output: out.join("\n"), failures };
}
