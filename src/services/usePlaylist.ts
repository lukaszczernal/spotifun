import { createResource } from "solid-js";
import { responseHandler } from "./authorize";
import { Track, Playlist } from "./model";
import { useAuth } from "./useAuth";

type PlaylistProps = {
  playlistId: string;
};

const resolvePlaylistUrl = (playlistId: string) => {
  if (!playlistId) {
    return "api/mocks/playlist.json";
    // return "https://api.spotify.com/v1/playlists/70N5mgNl3QBQB09zXoa72h";
  }
  return `https://api.spotify.com/v1/playlists/${playlistId}`;
};
// const PLAYLIST_URL = "api/mocks/playlist.json";

const fetchPlaylist = ({ playlistId }: PlaylistProps) => {
  const { getAccessToken } = useAuth();
  const accessToken = getAccessToken();

  return fetch(resolvePlaylistUrl(playlistId), {
    headers: {
      Authorization: "Bearer " + accessToken,
    },
  })
    .then((res) => responseHandler<Playlist>(res))
    .then((res) => res.tracks.items.map((item) => item.track))
    .then((tracks) => tracks.filter((track) => track.preview_url))
    .then((tracks) =>
      tracks.length ? tracks : Promise.reject("No previews on playlist"),
    );
};

const usePlaylist = ({ playlistId }: PlaylistProps) =>
  createResource<Track[], number>(() => fetchPlaylist({ playlistId }));

export default usePlaylist;
