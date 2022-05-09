import { Component, For } from 'solid-js';
import { Track } from '../../services/useTracks';

import styles from './CoverScroll.module.css';

interface Props {
  tracks?: Track[];
  selectedTrack?: Track;
  onTrackSelect: (track: Track) => any;
}

const CoverScroll: Component<Props> = (props) => {
  return (
    <div className={styles.coverScroll}>
      <ul className={styles.coverScroll__covers}>
        <For each={props.tracks}>
          {(track) => (
            <li
              className={
                props.selectedTrack?.track.id === track.track.id
                  ? styles.coverScroll__cover_selected
                  : styles.coverScroll__cover
              }
            >
              <a onClick={() => props.onTrackSelect(track)}>
                <img
                  className={styles.coverScroll__coverImage}
                  src={track.track.album.images[1].url}
                />
              </a>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
};

export default CoverScroll;
