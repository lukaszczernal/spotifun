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

  // const isCorrect = () => {
  //   return mysteryTrack()?.track.id === selected()?.track.id;
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

  const isSelected = (track?: Track) => track === selected();

  const transformMap = ['25%, 25%', '-25%, 25%', '25%, -25%', '-25%, -25%'];

  const getSelectedStyle = (index: number) => ({
    'z-index': 3,
    transform: `scale(2.14) translate(${transformMap[index]})`,
  });

  return (
    <Switch fallback={<ScoreBoard />}>
      <Match when={stage() <= STAGE_COUNT}>
        <section className={styles.stage__scroller}>
          <SplashText subtitle="Choose correct album" />
          <section className={styles.stage__coverList}>
            <For each={randomTracks()}>
              {(track, index) => {
                return (
                  <div className={styles.stage__coverPlaceholder}>
                    <a
                      style={isSelected(track) ? getSelectedStyle(index()) : {}}
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
