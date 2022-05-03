import { createSignal, For, Show, useContext } from 'solid-js';
import { GameContext } from '../services/useGame';
import useRandomTracks from '../services/useRandomTracks';
import { Track } from '../services/useTracks';
import styles from './Stage.module.css';

const Stage = () => {
  const [selectedTrack, setSelectedTrack] = createSignal<Track>();
  const [{currentStage}, gameAction] = useContext(GameContext)!;
  const { randomTracks, mysteryTrack } = useRandomTracks(currentStage)!;

  return (
    <>
    {currentStage()}
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
                <img src={track.track.album.images[2].url} />
              </a>
            </li>
          )}
        </For>
      </ul>
      <Show when={mysteryTrack()?.track.preview_url}>
        <audio controls>
          <source src={mysteryTrack()?.track.preview_url} type="audio/mpeg" />
        </audio>
      </Show>

      <button
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
