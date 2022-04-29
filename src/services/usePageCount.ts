import { createEffect, createSignal } from 'solid-js';
import { Accessor, ResourceActions } from 'solid-js/types/reactive/signal';
import useTracks, { Tracks } from './useTracks';

const PAGE_SIZE = 50;

const countPages = (total?: number) =>
  Math.ceil((total || PAGE_SIZE) / PAGE_SIZE);

const usePageCount = (): [
  Accessor<number>,
  ResourceActions<Tracks | undefined>
] => {
  const [pageCount, setPageCount] = createSignal(0);
  const [firstPage, rest] = useTracks();

  createEffect(() => {
    setPageCount(countPages(firstPage()?.total));
  });

  return [pageCount, rest];
};

export default usePageCount;
