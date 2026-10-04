import { batch, createEffect, createMemo, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { STAGE_SIZE } from "../config";
import { Track, TrackStageItem } from "./model";
import usePlaylist from "./usePlaylist";

interface TrackStore {
  stage: TrackStageItem[];
  tracks: TrackStageItem[];
}

type TrackStoreProps = {
  playlistId: string;
};

const getRandomInt = (max: number) => Math.floor(Math.random() * max);

const shuffle = <T>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Fills `base` up to `count` items from `candidates`, preferring candidates
 * whose album is not on the stage yet so that the same cover is not shown
 * twice. Once the distinct albums run out the remaining candidates are used,
 * because a full stage matters more than a perfectly unique one.
 */
const topUp = <T extends TrackStageItem>(
  base: T[],
  candidates: T[],
  count: number,
): T[] => {
  const albums = new Set(base.map((item) => item.track.album.id));
  const filled = [...base];
  const rest: T[] = [];

  for (const item of candidates) {
    if (filled.length === count) break;
    if (albums.has(item.track.album.id)) {
      rest.push(item);
      continue;
    }
    albums.add(item.track.album.id);
    filled.push(item);
  }

  for (const item of rest) {
    if (filled.length === count) break;
    filled.push(item);
  }

  return filled;
};

const useTrackStore = ({ playlistId }: TrackStoreProps) => {
  const [playlist] = usePlaylist({ playlistId });
  const [trackStore, updateTracksStore] = createStore<TrackStore>({
    stage: [],
    tracks: [],
  });
  const [mysteryIndex, setMysteryIndex] = createSignal(0);

  const stageTracks = createMemo(() => trackStore.stage);

  const trackCount = createMemo(() => playlist()?.length);

  const freeTracks = () =>
    trackStore.tracks.filter((track) => !track.played && !track.staged);

  createEffect(() => {
    if (trackStore.stage.length >= STAGE_SIZE) return;
    if (freeTracks().length < STAGE_SIZE) return;

    const initialStage = drawTracks(STAGE_SIZE);

    batch(() => {
      updateTracksStore("stage", initialStage);
      setMysteryIndex(getRandomInt(STAGE_SIZE));
    });
  });

  const mysteryTrack = createMemo(() => trackStore.stage[mysteryIndex()]);

  /**
   * Takes up to `count` tracks that have not been played or shown yet and
   * marks them as staged, so that they cannot be drawn a second time.
   *
   * Tracks are picked from distinct albums: the cover belongs to the album,
   * not the track, so two tracks of one album would put the very same image
   * on the stage twice and the player could not tell them apart. When there
   * are not enough distinct albums left, the remaining slots are filled with
   * any free track - a repeated cover is better than a stage that cannot be
   * built at all.
   */
  const drawTracks = (count: number): TrackStageItem[] => {
    const drawn = topUp([], freeTracks(), count);
    drawn.forEach((item) => setStaged(item, true));
    return drawn;
  };

  /**
   * Replaces every cover on the stage once the mystery track has been answered.
   * New tracks are drawn before the outgoing covers are released, so that the
   * covers the player has just seen are not immediately drawn again. Towards
   * the end of a playlist there may not be enough unseen tracks left to build a
   * whole new stage - the remaining covers are then reused in new positions.
   *
   * Returns false when the playlist is exhausted and the stage could not be
   * rebuilt, so the caller can end the round instead of leaving the player on a
   * stage that no longer advances.
   */
  const reshuffleStage = (): boolean => {
    const leaving = trackStore.stage.filter((item) => !item.played);
    const fresh = drawTracks(STAGE_SIZE);

    const nextStage =
      fresh.length === STAGE_SIZE
        ? fresh
        : // Carried-over covers must not stay in the position the player has
          // just seen them in, so the reused stage is shuffled.
          shuffle(topUp(fresh, shuffle(leaving), STAGE_SIZE));

    if (nextStage.length < STAGE_SIZE) {
      // Not enough covers left to rebuild the stage - keep the current one
      // rather than rendering an incomplete grid.
      fresh.forEach((item) => setStaged(item, false));
      return false;
    }

    const staying = nextStage.map((item) => item.track.id);

    batch(() => {
      leaving
        .filter((item) => !staying.includes(item.track.id))
        .forEach((item) => setStaged(item, false));

      updateTracksStore("stage", nextStage);
      // Every cover on the new stage is unplayed, so the mystery track is
      // always a track the player has not been asked about yet.
      setMysteryIndex(getRandomInt(STAGE_SIZE));
    });

    return true;
  };

  const setStaged = (track: TrackStageItem | undefined, staged: boolean) => {
    const index = trackStore.tracks.findIndex(
      (item) => item.track.id === track?.track.id,
    );
    if (index < 0) return;
    updateTracksStore("tracks", index, "staged", staged);
  };

  const markAsPlayed = (track: Track | undefined) => {
    const index = trackStore.tracks.findIndex(
      (item) => item.track.id === track?.id,
    );
    if (index < 0) return;
    updateTracksStore("tracks", index, "played", true);
  };

  const resetTracks = (newTracks: Track[] = []) => {
    updateTracksStore(
      "tracks",
      [...newTracks].map((track) => ({ track, played: false, staged: false })),
    );
  };

  createEffect(() => {
    const randomizedTracks = playlist()?.sort(() =>
      Math.random() > 0.5 ? 1 : -1,
    );
    resetTracks(randomizedTracks);
  });

  return {
    stageTracks,
    mysteryTrack,
    trackCount,
    markAsPlayed,
    reshuffleStage,
  };
};

export default useTrackStore;
