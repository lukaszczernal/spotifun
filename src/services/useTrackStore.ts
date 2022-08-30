import { createEffect, createMemo } from 'solid-js';
import { createStore } from 'solid-js/store';
import { STAGE_SIZE } from '../config';
import { Track } from './model';
import usePlaylist from './usePlaylist';

interface TrackStageItem {
  track: Track;
  guessed: boolean;
  staged: boolean;
}

interface TrackStore {
  tracks: TrackStageItem[];
}

interface StageStore {
  tracks: TrackStageItem[];
}

const getRandomInt = (max: number) => Math.floor(Math.random() * max);

const useTrackStore = () => {
  const [stageTracks, updateStageTracks] = createStore<StageStore>({
    tracks: [],
  });
  const [playlist] = usePlaylist();
  const [trackStore, updateTracksStore] = createStore<TrackStore>({
    tracks: [],
  });

  const trackCount = createMemo(() => playlist()?.length);
  const guessedCount = createMemo(
    () => trackStore.tracks.filter((item) => item.guessed).length
  );

  const nextFreeTrack = createMemo(() =>
    trackStore.tracks.find((track) => !track.guessed && !track.staged)
  );

  createEffect(() => {
    if (!trackStore.tracks.length) return;

    const emptySlotIndex =
      stageTracks.tracks.length < STAGE_SIZE
        ? stageTracks.tracks.length
        : stageTracks.tracks.findIndex((item) => item.guessed);
    if (emptySlotIndex < 0) return;

    const nextTrack = drawNextTrack();
    if (!nextTrack) return;

    updateStageTracks('tracks', emptySlotIndex, nextTrack);
    updateStageTracks('tracks', [...stageTracks.tracks]); // Only to trigger change
  });

  const mysteryTrack = createMemo(() => {
    const randomIndex = getRandomInt(4);
    return stageTracks.tracks[randomIndex];
  });

  const drawNextTrack = (): TrackStageItem | undefined => {
    const nextTrack = nextFreeTrack();
    markAsStaged(nextTrack);
    return nextTrack;
  };

  const markAsStaged = (track: TrackStageItem | undefined) => {
    const index = trackStore.tracks.findIndex(
      (item) => item.track.id === track?.track.id
    );
    if (index < 0) return;
    updateTracksStore('tracks', index, 'staged', true);
  };

  const markAsGuessed = (track: Track | undefined) => {
    const index = trackStore.tracks.findIndex(
      (item) => item.track.id === track?.id
    );
    if (index < 0) return;
    updateTracksStore('tracks', index, 'guessed', true);
  };

  const resetTracks = (newTracks: Track[] = []) => {
    updateTracksStore(
      'tracks',
      [...newTracks].map((track) => ({ track, guessed: false, staged: false }))
    );
  };

  createEffect(() => {
    const randomizedTracks = playlist()?.sort(() =>
      Math.random() > 0.5 ? 1 : -1
    );
    resetTracks(randomizedTracks);
  });

  return { stageTracks, mysteryTrack, trackCount, guessedCount, markAsGuessed };
};

export default useTrackStore;
