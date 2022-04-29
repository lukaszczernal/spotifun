import { Accessor, createMemo } from 'solid-js';
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

const useRandomTracks = (): [
  Accessor<Track[] | undefined>,
  Accessor<number[]>,
  Accessor<string | undefined>
] => {
  const [pageCount] = usePageCount();

  const randomPageNumbers = createMemo(() => getRandomNumbers(pageCount()));

  const [tracks] = useTracks(randomPageNumbers);

  const randomTracks = createMemo(() => {
    const pageLength = tracks()?.length;
    return tracks()?.map((track) => track[getRandomInt(pageLength || 0)]);
  });

  const preview = createMemo(() => {
    const tracks = randomTracks();
    return tracks?.[getRandomInt(3)]?.track.preview_url;
  });

  return [randomTracks, randomPageNumbers, preview];
};

export default useRandomTracks;
