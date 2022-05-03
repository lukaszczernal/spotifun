import { Accessor, createEffect, createMemo, createSignal } from 'solid-js';
import usePageCount from './usePageCount';
import useTracks, { Track } from './useTracks';

const getRandomInt = (max: number) => Math.floor(Math.random() * max);

const getRandomNumbers = (max: number, length: number = 3) => {
  const result: number[] = [];
  if (max > 0) {
    while (length--) {
      result.push(getRandomInt(max));
    }
  }
  return result;
};

const useRandomTracks = (
  stage: Accessor<number>
): {
  randomTracks: Accessor<Track[] | undefined>;
  mysteryTrack: Accessor<Track | undefined>;
} => {
  const [pageCount] = usePageCount();
  const [randomNumbers, setRandomNumbers] = createSignal<number[]>([]);

  createEffect(() => {
    stage(); // Added only to trigger effect
    setRandomNumbers(getRandomNumbers(pageCount()));
  });

  const [tracks] = useTracks(randomNumbers);

  const randomTracks = createMemo(() => {
    const pageLength = tracks()?.length;
    return tracks()?.map((track) => track[getRandomInt(pageLength || 0)]);
  });

  const mysteryTrack = createMemo(() => {
    const tracks = randomTracks();
    return tracks?.[getRandomInt(3)];
  });

  return { randomTracks, mysteryTrack };
};

export default useRandomTracks;
