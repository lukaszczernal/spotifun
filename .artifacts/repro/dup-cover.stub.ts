// Stands in for src/services/usePlaylist.ts, modelling what real Deezer
// playlists actually return: several tracks that belong to the SAME album and
// therefore carry an identical cover image.
//
// playlistId encodes "<trackCount>x<tracksPerAlbum>", e.g. "20x2" = 20 tracks
// spread over 10 albums, 2 tracks each.
import { createSignal } from "solid-js";

type PlaylistProps = { playlistId: string };

const makeTrack = (id: number, albumId: number) => ({
  id,
  name: `track-${id}`,
  previewUrl: `https://example.invalid/preview/${id}.mp3`,
  artist: `artist-${albumId}`,
  album: {
    id: albumId,
    name: `album-${albumId}`,
    // Same album -> byte-identical cover URL. This is what the player sees.
    coverMedium: `https://example.invalid/cover/${albumId}-medium.jpg`,
    coverBig: `https://example.invalid/cover/${albumId}-big.jpg`,
  },
});

const usePlaylist = ({ playlistId }: PlaylistProps) => {
  const [size, perAlbum] = playlistId.split("x").map(Number);
  const count = size || 20;
  const group = perAlbum || 2;
  const [playlist] = createSignal(
    Array.from({ length: count }, (_, i) =>
      makeTrack(i + 1, Math.floor(i / group) + 1),
    ),
  );
  return [playlist] as const;
};

export default usePlaylist;
