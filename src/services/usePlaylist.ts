import { createResource } from 'solid-js';
import { responseHandler } from './authorize';
import { Track, Playlist } from './model';
import { useAuth } from './useAuth';

// const PLAYLIST_URL = 'https://api.spotify.com/v1/playlists/70N5mgNl3QBQB09zXoa72h';
const PLAYLIST_URL = 'api/mocks/playlist.json';

export const fetchPlaylist = () => {
  const { getAccessToken } = useAuth();
  const accessToken = getAccessToken();

  return fetch(PLAYLIST_URL, {
    headers: {
      Authorization: 'Bearer ' + accessToken,
    },
  })
    .then((res) => responseHandler<Playlist>(res))
    .then((res) => res.tracks.items.map((item) => item.track))
    .then((tracks) => tracks.filter((track) => track.preview_url))
    .then((tracks) =>
      tracks.length ? tracks : Promise.reject('No previews on playlist')
    );
};

const usePlaylist = () => createResource<Track[], number>(fetchPlaylist);

export default usePlaylist;
