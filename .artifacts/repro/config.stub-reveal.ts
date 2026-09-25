// Like config.stub.ts, but keeps the reveal delays non-zero so the auto-check
// harness can observe the reveal window while it is open. Short enough to keep
// the run fast, long enough to sample reliably between the two waits.
export { STAGE_SIZE, ROUND_LENGTH } from "../../src/config";

export const COVER_ZOOM_DURATION = 10;
export const REVEAL_DURATION = 150;
