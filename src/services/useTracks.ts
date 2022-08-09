import { Accessor, createResource } from 'solid-js';
import { responseHandler } from './authorize';
import { PAGE_SIZE } from './config';
import { Track, Tracks } from './model';
import { useAuth } from './useAuth';

const getQueryParams = (pageNumber: number) =>
  `limit=${PAGE_SIZE}&offset=${PAGE_SIZE * pageNumber}`;

export const fetchPage = (pageNumber: number = 0) => {
  const { getAccessToken } = useAuth();
  const accessToken = getAccessToken();

  // if (accessToken && pageNumbers.length) {
  // return Promise.all(
  //   pageNumbers.map((pageNumber) =>
  return fetch(
    `https://api.spotify.com/v1/me/tracks?${getQueryParams(pageNumber)}`,
    {
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    }
  )
    .then((res) => responseHandler<Tracks>(res))
    .then((page) => page.items)
    .then((tracks) => tracks.filter((track) => track.track.preview_url))
    .then((tracks) =>
      tracks.length ? tracks : Promise.reject('No previews on page')
    );
  //   )
  // );
};

// if (pageNumbers.length === 0) {
//   return Promise.resolve(undefined);
// }

//   return Promise.reject('Access Denied. Please log in.');
// };

const useTracks = (pageNumber: Accessor<number>) =>
  createResource<Track[], number>(pageNumber, fetchPage);

export default useTracks;
