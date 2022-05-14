import { Accessor, Component, createEffect, createSignal } from 'solid-js';
import { Track } from '../../services/useTracks';
import { PAUSE_ICON, PLAY_ICON } from './icons';

import styles from './Player.module.css';

interface Props {
  track: Accessor<Track | undefined>;
}

const Player: Component<Props> = ({ track }) => {
  const [playing, setPlaying] = createSignal<boolean>(true);
  let playerRef: any; // TODO typings
  const [playbackURL, setPlaybackURL] = createSignal<string>();

  const togglePlay = () => {
    setPlaying((prev) => !prev);
  };

  createEffect(() => {
    if (playing()) {
      playerRef?.play();
    } else {
      playerRef?.pause();
    }
  });

  createEffect(() => {
    setPlaybackURL(track()?.track.preview_url);
    playerRef?.load();
    playerRef?.play();
    setPlaying(true);
  });

  return (
    <div className={styles.player}>
      <a className={styles.player__button} onClick={togglePlay}>
        {playing() ? PAUSE_ICON : PLAY_ICON}
      </a>
      <audio ref={playerRef} loop autoplay>
        <source src={playbackURL()} type="audio/mpeg" />
      </audio>
    </div>
  );
};

export default Player;
