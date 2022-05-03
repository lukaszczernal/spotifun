import {
  Accessor,
  Component,
  createEffect,
  createSignal,
} from 'solid-js';
import { Track } from '../../services/useTracks';

interface Props {
  track: Accessor<Track | undefined>;
}

const Player: Component<Props> = ({ track }) => {
  let playerRef: any; // TODO typings
  const [playbackURL, setPlaybackURL] = createSignal<string>();

  createEffect(() => {
    setPlaybackURL(track()?.track.preview_url);
    playerRef?.load();
  });

  return (
    <audio ref={playerRef} controls>
      <source src={playbackURL()} type="audio/mpeg" />
    </audio>
  );
};

export default Player;
