import { Accessor, createMemo, Resource } from 'solid-js';
import { PAGE_SIZE } from './config';
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
  Accessor<number[]>
] => {
  const [pageCount] = usePageCount();

  const randomPageNumbers = createMemo(() => getRandomNumbers(pageCount()));

  const [pages] = useTracks(randomPageNumbers);

  const randomTracks = createMemo(() => {
    console.log('pages', pages());
    return pages()?.map(page => page.items[getRandomInt(PAGE_SIZE)])
  });

  return [randomTracks, randomPageNumbers];
};

export default useRandomTracks;
