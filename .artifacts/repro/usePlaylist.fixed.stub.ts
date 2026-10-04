// Stands in for src/services/usePlaylist.ts in checks that drive the real
// catalogue ids. usePlaylist.stub.ts reads the playlist id as the track count,
// which for a real Deezer id ("9010236822") would try to build billions of
// tracks; here every playlist is the same small playable set.
import { createSignal } from "solid-js";

type PlaylistProps = { playlistId: string };

const SIZE = 10;

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

const usePlaylist = (_props: PlaylistProps) => {
  const [playlist] = createSignal(
    Array.from({ length: SIZE }, (_, i) => makeTrack(i + 1)),
  );
  return [playlist] as const;
};

export default usePlaylist;
