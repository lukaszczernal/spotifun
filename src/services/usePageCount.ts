import { createMemo, createResource } from 'solid-js';
import { Accessor } from 'solid-js/types/reactive/signal';
import { PAGE_SIZE } from './config';
import { useAuth } from './useAuth';
import { Tracks } from './useTracks';

const fetchTrack = () => {
  const { getAccessToken } = useAuth();
  const accessToken = getAccessToken();

  return accessToken
    ? fetch('https://api.spotify.com/v1/me/tracks', {
        headers: {
          Authorization: 'Bearer ' + accessToken,
        },
      }).then((res) => res.json() as Promise<Tracks>)
    : Promise.reject('Access Denied. Please log in.');
};

const countPages = (total?: number) =>
  total ? Math.ceil(total / PAGE_SIZE) : 0;

const usePageCount = (): [Accessor<number>, Accessor<number | undefined>] => {
  const [firstPage] = createResource(fetchTrack);

  const total = createMemo(() => firstPage()?.total);
  const pageCount = createMemo(() => countPages(total()));

  return [pageCount, total];
};

export default usePageCount;
