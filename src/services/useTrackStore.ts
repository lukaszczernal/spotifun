import { Accessor, createEffect, createMemo, createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { STAGE_SIZE } from '../config';
import { Track } from './model';
import usePageCount from './usePageCount';
import useTracks from './useTracks';

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

const useTrackStore = (stage: Accessor<number>) => {
  const [pageCount, total] = usePageCount();
  const [stageTracks, setStageTracks] = createSignal<Track[]>([]);
  const [mysteryTrack, setMysteryTrack] = createSignal<Track>();
  // const [pageNumbers, setPageNumbers] = createSignal<number[]>([]);
  // const [trackStore, updateTracksStore] = createStore<TrackStore>({
  //   tracks: [],
  // });

  // createEffect(() => {
  //   if (trackStore.tracks.length < 2 * STAGE_SIZE) {
  //     setPageNumbers(getRandomNumbers(pageCount()));
  //   }
  // });

  // createEffect(() => {
  //   if (stage() > 1) {
  //     removeTracks();
  //   }
  // });

  // const [trackPages] = useTracks(1);

  // const stageTracks = createMemo(() => trackStore.tracks.slice(0, STAGE_SIZE));

  // const removeTracks = () => {
  //   updateTracksStore('tracks', (state) => {
  //     return [...state.slice(STAGE_SIZE, state.length)];
  //   });
  // };

  // const addNewTracks = (newTracks: Track[]) => {
  //   updateTracksStore('tracks', (state) => [...state, ...newTracks]);
  // };

  createEffect(() => {
    // const pageLengths = trackPages()?.map((page) => page.length) || [0];
    // let pageCount = Math.min(...pageLengths);
    console.log('pageCount', pageCount);

    // const newTracks: Track[] = [];
    // while (pageCount--) {
    //   trackPages()?.forEach((page) => {
    //     newTracks.push(page[pageCount]);
    //   });
    // }

    // addNewTracks(newTracks);
  });

  // const mysteryTrack = createMemo(() => {
  //   return stageTracks()?.[getRandomInt(STAGE_SIZE)];
  // });

  return { stageTracks, mysteryTrack };
};

export default useTrackStore;

