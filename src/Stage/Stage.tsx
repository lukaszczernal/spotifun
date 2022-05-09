import {
  createEffect,
  createSignal,
  For,
  Match,
  onMount,
  Show,
  Switch,
  useContext,
} from 'solid-js';
import { Player } from '../components/Player';
import { ScoreBoard } from '../ScoreBoard';
import { GameContext, Score } from '../services/useGame';
import useRandomTracks from '../services/useRandomTracks';
import { Track } from '../services/useTracks';
import styles from './Stage.module.css';

const Stage = () => {
  const [selectedTrack, setSelectedTrack] = createSignal<Track>();
  const [stageScore, setStageScore] = createSignal<Score | null>(null);
  const [{ stage }, gameAction] = useContext(GameContext)!;
  const { randomTracks, mysteryTrack } = useRandomTracks(stage)!;

  const checkStage = () => {
    setStageScore({
      selectedTrack: selectedTrack(),
      correctTrack: mysteryTrack(),
    });
  };

  const isCorrect = () => {
    const { correctTrack, selectedTrack } = stageScore() || {};
    return correctTrack?.track.id === selectedTrack?.track.id;
  };

  createEffect(() => {
    stage(); // Only to trigger update
    setStageScore(null);
  });

  createEffect(() => {
    setSelectedTrack(randomTracks()?.[0]);
  });

  onMount(() => {
    gameAction.startGame();
  });

  return (
    <Switch fallback={<ScoreBoard />}>
      <Match when={stage() <= 3}>
        <h1>Guess cover by sample</h1>

        <Show when={stageScore()}>
          {isCorrect() ? 'You are right!' : 'Sorry, wrong cover'}
        </Show>

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

        <Show when={stageScore() === null}>
          <button onClick={checkStage}>Check</button>
        </Show>

        <Show when={stageScore()}>
          <button
            disabled={!selectedTrack()}
            onClick={() => {
              gameAction.nextStage({
                correctTrack: mysteryTrack(),
                selectedTrack: selectedTrack(),
              });
            }}
          >
            Next stage
          </button>
        </Show>
      </Match>
    </Switch>
  );
};

export default Stage;
