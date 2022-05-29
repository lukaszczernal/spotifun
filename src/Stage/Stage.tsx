import {
  createEffect,
  For,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
  useContext,
} from 'solid-js';
import { PlayerControls } from '../components/PlayerControls';
import { SplashText } from '../components/SplashText';
import { STAGE_COUNT } from '../config';
import { ScoreBoard } from '../ScoreBoard';
import { GameContext } from '../services/useGame';
import { usePlayer } from '../services/usePlayer';
import useRandomTracks from '../services/useRandomTracks';

import styles from './Stage.module.css';

const Stage = () => {
  const [{ stage }, gameAction] = useContext(GameContext)!;
  const { clear, pause } = usePlayer()!;
  const { randomTracks, mysteryTrack } = useRandomTracks(stage)!;

  const goToNextStage = (selectedIndex: number = 0) => {
    const selectedTrack = randomTracks()[selectedIndex];
    gameAction.nextStage({
      correctTrack: mysteryTrack(),
      selectedTrack,
    });
  };

  // TODO check if we should come back to stage result concept
  // const isCorrect = () => {
  //   const { correctTrack, selectedTrack } = stageScore() || {};
  //   return correctTrack?.track.id === selectedTrack?.track.id;
  // };

  createEffect(() => {
    stage(); // Only to trigger update
    if (stage() > STAGE_COUNT) {
      pause();
    }
  });

  onMount(() => {
    gameAction.startGame();
  });

  onCleanup(() => {
    gameAction.exitGame();
    clear();
  });

  return (
    <Switch fallback={<ScoreBoard />}>
      <Match when={stage() <= STAGE_COUNT}>
        <section className={styles.stage__scroller}>
          <SplashText subtitle="Choose correct cover" />
          <section className={styles.stage__coverList}>
            <For each={randomTracks()}>
              {(track, index) => {
                return (
                  <a
                    className={styles.stage__cover}
                    onClick={() => goToNextStage(index())}
                  >
                    <img src={track?.track.album.images[1].url} />
                  </a>
                );
              }}
            </For>
          </section>
        </section>
        <div className={styles.stage__playerControls}>
          <Show when={mysteryTrack()}>
            <PlayerControls track={mysteryTrack} />
          </Show>
        </div>
      </Match>
    </Switch>
  );
};

export default Stage;
