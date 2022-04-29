import { createEffect, createSignal } from 'solid-js';
import { Accessor, ResourceActions } from 'solid-js/types/reactive/signal';
import { PAGE_SIZE } from './config';
import useTracks, { Tracks } from './useTracks';

const countPages = (total?: number) =>
  total ? Math.ceil(total / PAGE_SIZE) : 0;

const usePageCount = (): [
  Accessor<number>,
  ResourceActions<Tracks[] | undefined>
] => {
  const [pageCount, setPageCount] = createSignal(0);
  const [firstPage, rest] = useTracks(() => [0]);

  createEffect(() => {
    setPageCount(countPages(firstPage()?.[0].total));
  });

  return [pageCount, rest];
};

export default usePageCount;
