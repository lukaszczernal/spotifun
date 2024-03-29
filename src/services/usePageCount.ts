import { createMemo, createResource } from 'solid-js';
import { Accessor } from 'solid-js/types/reactive/signal';
import { responseHandler } from './authorize';
import { PAGE_SIZE } from './config';
import { Tracks } from './model';
import { useAuth } from './useAuth';

const fetchTrack = () => {
  const { getAccessToken } = useAuth();
  const accessToken = getAccessToken();

  return accessToken
    ? fetch('https://api.spotify.com/v1/me/tracks', {
        headers: {
          Authorization: 'Bearer ' + accessToken,
        },
      }).then((res) => responseHandler<Tracks>(res))
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
