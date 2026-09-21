// Stands in for src/services/usePlaylist.ts so the harness runs without any
// network access. The playlistId is used as the number of tracks to generate.
import { createSignal } from "solid-js";

type PlaylistProps = { playlistId: string };

const makeTrack = (id: number) => ({
  id,
  name: `track-${id}`,
  previewUrl: `https://example.invalid/preview/${id}.mp3`,
  artist: `artist-${id}`,
  album: {
    id,
    name: `album-${id}`,
    coverMedium: `https://example.invalid/cover/${id}-medium.jpg`,
    coverBig: `https://example.invalid/cover/${id}-big.jpg`,
  },
});

const usePlaylist = ({ playlistId }: PlaylistProps) => {
  const size = Number(playlistId) || 10;
  const [playlist] = createSignal(
    Array.from({ length: size }, (_, i) => makeTrack(i + 1)),
  );
  return [playlist] as const;
};

export default usePlaylist;
