// Stands in for src/config.ts so the reveal delays do not cost real wall clock
// time - a ten guess round would otherwise sit through 10 x REVEAL_DURATION.
// Only the durations are collapsed; the gameplay constants stay real.
//
// The aliases point at "../config" / "../../config" (the specifiers src files
// use), never at "../../src/config" below, so this re-export cannot resolve
// back into this stub.
export { STAGE_SIZE, ROUND_LENGTH } from "../../src/config";

export const COVER_ZOOM_DURATION = 0;
export const REVEAL_DURATION = 0;
