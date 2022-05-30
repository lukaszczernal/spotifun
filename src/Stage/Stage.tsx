import {
  createEffect,
  createSignal,
  For,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
  useContext,
} from 'solid-js';
import { Button } from '../components/Button';
import { Footer } from '../components/Footer';
import { PlayerControls } from '../components/PlayerControls';
import { SplashText } from '../components/SplashText';
import { STAGE_COUNT } from '../config';
import { ScoreBoard } from '../ScoreBoard';
import { GameContext } from '../services/useGame';
import { usePlayer } from '../services/usePlayer';
import useRandomTracks from '../services/useRandomTracks';
import { Track } from '../services/useTracks';

import styles from './Stage.module.css';

const Stage = () => {
  const [selected, setSelected] = createSignal<Track>();
  const [{ stage }, gameAction] = useContext(GameContext)!;
  const { clear, pause } = usePlayer()!;
  const { randomTracks, mysteryTrack } = useRandomTracks(stage)!;

  const goToNextStage = (selectedTrack?: Track) => {
    if (!selectedTrack) {
      return;
    }

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

  const selectCover = (track?: Track) => {
    setSelected((prev) => (prev === track ? undefined : track));
  };

  createEffect(() => {
    stage(); // Only to trigger update
    setSelected(); // Clear selection
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
              {(track) => {
                return (
                  <div className={styles.stage__coverPlaceholder}>
                    <a
                      className={styles.stage__cover}
                      onClick={() => selectCover(track)}
                    >
                      <img src={track?.track.album.images[1].url} />
                    </a>
                  </div>
                );
              }}
            </For>
          </section>
        </section>

        <Show when={selected()}>
          <Footer>
            <Button onClick={() => goToNextStage(selected())} href="">
              Check
            </Button>
          </Footer>
        </Show>

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
