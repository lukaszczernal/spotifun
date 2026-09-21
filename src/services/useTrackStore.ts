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

const useTrackStore = ({ playlistId }: TrackStoreProps) => {
  const [playlist] = usePlaylist({ playlistId });
  const [trackStore, updateTracksStore] = createStore<TrackStore>({
    stage: [],
    tracks: [],
  });
  const [mysteryIndex, setMysteryIndex] = createSignal(0);

  const stageTracks = createMemo(() => trackStore.stage);

  const trackCount = createMemo(() => playlist()?.length);
  const guessedCount = createMemo(
    () => trackStore.tracks.filter((item) => item.guessed).length,
  );

  const freeTracks = () =>
    trackStore.tracks.filter((track) => !track.guessed && !track.staged);

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
   */
  const drawTracks = (count: number): TrackStageItem[] => {
    const drawn = freeTracks().slice(0, count);
    drawn.forEach((item) => setStaged(item, true));
    return drawn;
  };

  /**
   * Replaces every cover on the stage once the mystery track has been matched.
   * New tracks are drawn before the outgoing covers are released, so that the
   * covers the player has just seen are not immediately drawn again. Towards
   * the end of a playlist there may not be enough unseen tracks left to build a
   * whole new stage - the remaining covers are then reused in new positions.
   */
  const reshuffleStage = () => {
    const leaving = trackStore.stage.filter((item) => !item.guessed);
    const fresh = drawTracks(STAGE_SIZE);

    const nextStage =
      fresh.length === STAGE_SIZE
        ? fresh
        : shuffle([...fresh, ...leaving]).slice(0, STAGE_SIZE);

    if (nextStage.length < STAGE_SIZE) {
      // Not enough covers left to rebuild the stage - keep the current one
      // rather than rendering an incomplete grid.
      fresh.forEach((item) => setStaged(item, false));
      return;
    }

    const staying = nextStage.map((item) => item.track.id);

    batch(() => {
      leaving
        .filter((item) => !staying.includes(item.track.id))
        .forEach((item) => setStaged(item, false));

      updateTracksStore("stage", nextStage);
      // Every cover on the new stage is unguessed, so the mystery track is
      // always a track the player has not matched yet.
      setMysteryIndex(getRandomInt(STAGE_SIZE));
    });
  };

  const setStaged = (track: TrackStageItem | undefined, staged: boolean) => {
    const index = trackStore.tracks.findIndex(
      (item) => item.track.id === track?.track.id,
    );
    if (index < 0) return;
    updateTracksStore("tracks", index, "staged", staged);
  };

  const markAsGuessed = (track: Track | undefined) => {
    const index = trackStore.tracks.findIndex(
      (item) => item.track.id === track?.id,
    );
    if (index < 0) return;
    updateTracksStore("tracks", index, "guessed", true);
  };

  const resetTracks = (newTracks: Track[] = []) => {
    updateTracksStore(
      "tracks",
      [...newTracks].map((track) => ({ track, guessed: false, staged: false })),
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
    guessedCount,
    markAsGuessed,
    reshuffleStage,
  };
};

export default useTrackStore;
