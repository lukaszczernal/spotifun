import { jsonp } from "./jsonp";
import { DeezerError, DeezerTrack } from "./model";

/** Slack so a URL is not handed to the browser moments before it expires. */
const EXPIRY_MARGIN_S = 30;

/**
 * Deezer signs preview URLs with an `exp` timestamp about 15 minutes ahead.
 * Past it the CDN answers 403, so a track left paused for a while (e.g. with
 * the laptop locked) cannot be buffered again from the same URL.
 */
export const isPreviewExpired = (url?: string) => {
  const exp = url?.match(/exp=(\d+)/)?.[1];
  return exp !== undefined && Number(exp) - EXPIRY_MARGIN_S < Date.now() / 1000;
};

export const fetchPreviewUrl = (trackId: number) =>
  jsonp<DeezerTrack & DeezerError>(
    `https://api.deezer.com/track/${trackId}`,
  ).then((res) =>
    res.error || !res.preview
      ? Promise.reject(`No preview for track ${trackId}`)
      : res.preview,
  );
