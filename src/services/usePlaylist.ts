import { createResource } from "solid-js";
import { STAGE_SIZE } from "../config";
import { jsonp } from "./jsonp";
import { DeezerError, DeezerPlaylist, DeezerTrack, Track } from "./model";

type PlaylistProps = {
  playlistId: string;
};

const resolvePlaylistUrl = (playlistId: string) =>
  playlistId
    ? `https://api.deezer.com/playlist/${playlistId}`
    : "api/mocks/playlist.json";

const toTrack = (track: DeezerTrack): Track => ({
  id: track.id,
  name: track.title,
  previewUrl: track.preview,
  artist: track.artist.name,
  album: {
    id: track.album.id,
    name: track.album.title,
    coverMedium: track.album.cover_medium,
    coverBig: track.album.cover_big,
  },
});

const fetchPlaylist = ({ playlistId }: PlaylistProps) => {
  const url = resolvePlaylistUrl(playlistId);

  const request = playlistId
    ? jsonp<DeezerPlaylist & DeezerError>(url)
    : fetch(url).then((res) => res.json() as Promise<DeezerPlaylist>);

  return request
    .then((res) => {
      const error = (res as DeezerError).error;
      if (error) {
        return Promise.reject(`Deezer error: ${error.message}`);
      }
      return res.tracks.data;
    })
    .then((tracks) => tracks.filter((track) => track.preview))
    .then((tracks) => tracks.map(toTrack))
    .then((tracks) =>
      tracks.length >= STAGE_SIZE
        ? tracks
        : Promise.reject(
            `Not enough playable tracks on playlist (need ${STAGE_SIZE})`,
          ),
    );
};

const usePlaylist = ({ playlistId }: PlaylistProps) =>
  createResource<Track[], number>(() => fetchPlaylist({ playlistId }));

export default usePlaylist;
