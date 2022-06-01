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
import anime from 'animejs';
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
  const [{ stage, gameScore }, gameAction] = useContext(GameContext)!;
  const { clear, pause } = usePlayer()!;
  const { randomTracks, mysteryTrack } = useRandomTracks(stage)!;

  let recordRef: HTMLDivElement;

  const goToNextStage = () => {
    if (!selected()) {
      return;
    }

    gameAction.nextStage({
      correctTrack: mysteryTrack(),
      selectedTrack: selected(),
    });
  };

  const isCorrect = (selectedTrack?: Track) => {
    return mysteryTrack()?.track.id === selectedTrack?.track.id;
  };

  const selectCover = (track?: Track) => {
    setSelected((prev) => (prev === track ? undefined : track));
  };

  const slideRecordInside = (complete: () => any) => {
    return anime
      .timeline({
        targets: recordRef,
      })
      .add({
        translateY: '-100%',
        duration: 2400,
      })
      .add({
        targets: recordRef,
        translateY: 300,
        duration: 1,
      });
  };

  const slideRecordOutside = (complete: () => any) => {
    anime
      .timeline({
        targets: recordRef,
        complete,
      })
      .add({
        translateY: -100,
        duration: 1000,
      })
      .add({
        translateY: 300,
        duration: 1500,
      });
  };

  const checkRecord = (track?: Track) => {
    if (isCorrect(track)) {
      slideRecordInside(() => {
        goToNextStage();
        anime({
          targets: recordRef,
          translateY: 0,
          delay: 1000,
          duration: 2000,
        });
      });

      return;
    }

    slideRecordOutside(() => {
      goToNextStage();
      setSelected();
      anime({
        targets: recordRef,
        translateY: 0,
        delay: 1000,
        duration: 2000,
      });
    });
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

  const transformMap = [
    { bottom: '-105%', right: '-105%' },
    { bottom: '-105%', left: '-105%' },
    { top: '-105%', right: '-105%' },
    { top: '-105%', left: '-105%' },
  ];

  const getSelectedStyle = (index: number) => ({
    'z-index': 3,
    ...transformMap[index],
  });

  return (
    <Switch fallback={<ScoreBoard />}>
      <Match when={stage() <= STAGE_COUNT}>
        <section className={styles.stage__scroller}>
          <SplashText subtitle="Find correct album cover" />
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
                      <img src={track?.track.album.images[0].url} />
                    </a>
                  </div>
                );
              }}
            </For>
          </section>
        </section>

        <Show when={selected()}>
          <Footer>
            <Button onClick={() => checkRecord(selected())} href="">
              Check
            </Button>
          </Footer>
        </Show>

        <div ref={recordRef} className={styles.stage__playerControls}>
          <Show when={mysteryTrack()}>
            <PlayerControls track={mysteryTrack} />
          </Show>
        </div>
      </Match>
    </Switch>
  );
};

export default Stage;
