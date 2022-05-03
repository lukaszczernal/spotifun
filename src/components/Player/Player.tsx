import { Accessor, Component, createEffect, createSignal, ResourceFetcher } from 'solid-js';
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
    <>
      <p>Now playing: {playbackURL()}</p>
      <audio ref={playerRef} controls>
        <source src={playbackURL()} type="audio/mpeg" />
      </audio>
    </>
  );
};

export default Player;
