import { Accessor, createResource } from 'solid-js';
import { responseHandler } from './authorize';
import { PAGE_SIZE } from './config';
import { Tracks } from './model';
import { useAuth } from './useAuth';

const getQueryParams = (pageNumber: number) =>
  `limit=${PAGE_SIZE}&offset=${PAGE_SIZE * pageNumber}`;

const fetchTracks = (pageNumber: number = 0) => {
  const { getAccessToken } = useAuth();
  const accessToken = getAccessToken();

  return fetch(
    `https://api.spotify.com/v1/me/tracks?${getQueryParams(pageNumber)}`,
    {
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    }
  ).then((res) => responseHandler<Tracks>(res));
};

const usePage = (pageNumber: Accessor<number>) =>
  createResource<Tracks, number>(pageNumber, fetchTracks);

export default usePage;
