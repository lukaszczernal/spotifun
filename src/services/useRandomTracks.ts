import { Accessor, createEffect, createMemo, createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { STAGE_SIZE } from '../config';
import usePageCount from './usePageCount';
import useTracks, { Track } from './useTracks';

interface TrackStore {
  tracks: Track[];
}

const getRandomInt = (max: number) => Math.floor(Math.random() * max);

const getRandomNumbers = (max: number, length: number = STAGE_SIZE) => {
  const result: number[] = [];
  if (max > 0) {
    while (length--) {
      result.push(getRandomInt(max));
    }
  }
  return result;
};

const useRandomTracks = (stage: Accessor<number>) => {
  const [pageCount] = usePageCount();
  const [pageNumbers, setPageNumbers] = createSignal<number[]>([]);
  const [trackStore, updateTracksStore] = createStore<TrackStore>({
    tracks: [],
  });

  createEffect(() => {
    if (trackStore.tracks.length < 2 * STAGE_SIZE) {
      setPageNumbers(getRandomNumbers(pageCount()));
    }
  });

  createEffect(() => {
    if (stage() > 1) {
      removeTracks();
    }
  });

  const [trackPages] = useTracks(pageNumbers);

  const stageTracks = createMemo(() => trackStore.tracks.slice(0, STAGE_SIZE));

  const removeTracks = () => {
    updateTracksStore('tracks', (state) => {
      return [...state.slice(STAGE_SIZE, state.length)];
    });
  };

  const addNewTracks = (newTracks: Track[]) => {
    updateTracksStore('tracks', (state) => [...state, ...newTracks]);
  };

  createEffect(() => {
    const newTracks = trackPages()?.flat() || [];
    addNewTracks(newTracks);
  });

  const mysteryTrack = createMemo(() => {
    return stageTracks()?.[getRandomInt(STAGE_SIZE)];
  });

  return { randomTracks: stageTracks, mysteryTrack };
};

export default useRandomTracks;
