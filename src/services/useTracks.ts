import { Accessor, createResource } from 'solid-js';
import { responseHandler } from './authorize';
import { PAGE_SIZE } from './config';
import { useAuth } from './useAuth';

type ImageSize = 640 | 300 | 64;

interface TrackImage {
  height: ImageSize;
  url: string;
  width: ImageSize;
}

interface ExternalURL {
  external_urls: {
    spotify: string;
  };
}

export interface Track {
  added_at: string;
  track: {
    album: {
      album_type: string;
      artists: Array<
        {
          href: string;
          id: string;
          name: string;
          type: string;
          uri: string;
        } & ExternalURL
      >;
      available_markets: string[];
      href: string;
      id: string;
      images: TrackImage[];
      name: string;
      release_date: string;
      release_date_precision: string;
      total_tracks: number;
      type: string;
      uri: string;
    } & ExternalURL;
    artists: Array<
      {
        href: string;
        id: string;
        name: string;
        type: string;
        uri: string;
      } & ExternalURL
    >;
    available_markets: string[];
    disc_number: number;
    duration_ms: number;
    explicit: boolean;
    external_ids: { isrc: string };
    href: string;
    id: string;
    is_local: boolean;
    name: string;
    popularity: number;
    preview_url: string;
    track_number: number;
    type: string;
    uri: string;
  } & ExternalURL;
}

export interface Tracks {
  href: string;
  items: Track[];
  limit: number;
  next: string;
  offset: number;
  previous: string;
  total: number;
}

const getQueryParams = (pageNumber: number) =>
  `limit=${PAGE_SIZE}&offset=${PAGE_SIZE * pageNumber}`;

const fetchTracks = (pageNumbers: number[]) => {
  const { getAccessToken } = useAuth();
  const accessToken = getAccessToken();

  return accessToken
    ? Promise.all(
        pageNumbers.map((pageNumber) =>
          fetch(
            `https://api.spotify.com/v1/me/tracks?${getQueryParams(
              pageNumber
            )}`,
            {
              headers: {
                Authorization: 'Bearer ' + accessToken,
              },
            }
          )
            .then(res => responseHandler<Tracks>(res))
            .then((page) => page.items)
            .then((tracks) => tracks.filter((track) => track.track.preview_url))
        )
      )
    : Promise.reject('Access Denied. Please log in.');
};

const useTracks = (pageNumbers: Accessor<number[]> = () => []) =>
  createResource<Track[][], number[]>(pageNumbers, fetchTracks);

export default useTracks;

