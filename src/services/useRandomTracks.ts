import { Accessor, createEffect, createMemo, createSignal } from 'solid-js';
import { STAGE_SIZE } from '../config';
import usePageCount from './usePageCount';
import useTracks from './useTracks';

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
  const [randomNumbers, setRandomNumbers] = createSignal<number[]>([]);

  createEffect(() => {
    stage(); // Added only to trigger effect
    setRandomNumbers(getRandomNumbers(pageCount()));
  });

  const [tracks] = useTracks(randomNumbers);

  const randomTracks = createMemo(
    () =>
      tracks()?.map((track) => track[getRandomInt(track.length || 0)]) ||
      Array(3) // To render placeholder on a scroller
  );

  const mysteryTrack = createMemo(() => {
    const tracks = randomTracks();
    return tracks?.[getRandomInt(STAGE_SIZE)];
  });

  return { randomTracks, mysteryTrack };
};

export default useRandomTracks;
