import {
  createEffect,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
  useContext,
} from 'solid-js';
import { CoverScroll } from '../components/CoverScroll';
import { PlayerControls } from '../components/PlayerControls';
import { SplashText } from '../components/SplashText';
import { STAGE_SIZE } from '../config';
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
    if (stage() > 3) {
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
      <Match when={stage() <= 3}>
        <section className={styles.stage__scroller}>
          <SplashText subtitle={`Stage ${stage()}/${STAGE_SIZE}`} />
          <CoverScroll tracks={randomTracks()} onClick={goToNextStage} />
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
