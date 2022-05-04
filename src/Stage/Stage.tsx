import { createSignal, For, Show, useContext } from 'solid-js';
import { Player } from '../components/Player';
import { GameContext } from '../services/useGame';
import useRandomTracks from '../services/useRandomTracks';
import { Track } from '../services/useTracks';
import styles from './Stage.module.css';

const Stage = () => {
  const [selectedTrack, setSelectedTrack] = createSignal<Track>();
  const [{ stage }, gameAction] = useContext(GameContext)!;
  const { randomTracks, mysteryTrack } = useRandomTracks(stage)!;

  return (
    <>
      <div className={styles.stage__scroll}>
        <ul className={styles.stage__covers}>
          <For each={randomTracks()}>
            {(track) => (
              <li
                className={
                  selectedTrack()?.track.id === track.track.id
                    ? styles.stage__cover_selected
                    : styles.stage__cover
                }
              >
                <a onClick={() => setSelectedTrack(track)}>
                  <img
                    className={styles.stage__coverImage}
                    src={track.track.album.images[1].url}
                  />
                </a>
              </li>
            )}
          </For>
        </ul>
      </div>

      <Show when={mysteryTrack()}>
        <Player track={mysteryTrack} />
      </Show>

      <button
        disabled={!selectedTrack()}
        onClick={() => {
          gameAction.nextStage({
            correctTrack: mysteryTrack(),
            selectedTrack: selectedTrack(),
          });
        }}
      >
        Confirm
      </button>
    </>
  );
};

export default Stage;
