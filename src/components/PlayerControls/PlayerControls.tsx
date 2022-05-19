import { Accessor, Component, createEffect } from 'solid-js';
import { usePlayer } from '../../services/usePlayer';
import { Track } from '../../services/useTracks';
import { PAUSE_ICON, PLAY_ICON } from './icons';

import styles from './PlayerControls.module.css';

interface Props {
  track: Accessor<Track | undefined>;
}

const Player: Component<Props> = ({ track }) => {
  const { state, play, pause, load } = usePlayer()!;

  const togglePlay = () => {
    state() === 'play' ? pause() : play();
  };

  createEffect(() => {
    load(track?.()?.track.preview_url);
  });

  return (
    <div className={styles.playerControls}>
      <a className={styles.playerControls__button} onClick={togglePlay}>
        {state() === 'play' ? PAUSE_ICON : PLAY_ICON}
      </a>
    </div>
  );
};

export default Player;
