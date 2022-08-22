import { createEffect, createMemo } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Track } from './model';
import usePlaylist from './usePlaylist';

interface TrackStageItem {
  track: Track;
  guessed: boolean;
}

interface TrackStore {
  tracks: TrackStageItem[];
}

const getRandomInt = (max: number) => Math.floor(Math.random() * max);

const useTrackStore = () => {
  const [playlist] = usePlaylist();
  const [trackStore, updateTracksStore] = createStore<TrackStore>({
    tracks: [],
  });

  const trackCount = createMemo(() => playlist()?.length);

  const tracksToGuess = createMemo(() =>
    trackStore.tracks.filter((item) => item.guessed === false)
  );

  const stageTracks = createMemo(() => {
    return tracksToGuess().slice(0, 4);
  });

  const mysteryTrack = createMemo(() => {
    const randomIndex = getRandomInt(4);
    return stageTracks()[randomIndex];
  });

  const markAsGuessed = (track: Track | undefined, position?: number) => {
    updateTracksStore('tracks', (state) => {
      return [...state].map((item) => {
        if (item.track.id === track?.id) {
          item.guessed = true;
        }
        return item;
      });
    });
  };

  const resetTracks = (newTracks: Track[] = []) => {
    updateTracksStore(
      'tracks',
      [...newTracks].map((track) => ({ track, guessed: false }))
    );
  };

  createEffect(() => {
    const randomizedTracks = playlist()?.sort(() =>
      Math.random() > 0.5 ? 1 : -1
    );
    resetTracks(randomizedTracks);
  });

  return { stageTracks, mysteryTrack, trackCount, markAsGuessed };
};

export default useTrackStore;
