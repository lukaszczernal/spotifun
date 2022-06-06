import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  useContext,
} from 'solid-js';
import { useNavigate } from 'solid-app-router';
import Hammer from 'hammerjs';
import anime from 'animejs';
import { PlayerControls } from '../components/PlayerControls';
import { SplashText } from '../components/SplashText';
import { Cover } from '../components/Cover';
import { STAGE_COUNT } from '../config';
import { GameContext } from '../services/useGame';
import { usePlayer } from '../services/usePlayer';
import useRandomTracks from '../services/useRandomTracks';
import { Track } from '../services/useTracks';
import { Animate, AnimationType } from '../components/Animate';
import { SwipeUpIcon } from '../assets/gestureIcons';

import styles from './Stage.module.css';

const PAGE_TITLE = 'Select album cover';

const Stage = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = createSignal<Track>();
  const [stage, setStage] = createSignal(1);
  const [isChecking, setIsChecking] = createSignal(false);
  const [_, gameAction] = useContext(GameContext)!;
  const { pause, toggle: togglePlayer } = usePlayer()!;
  const { randomTracks, mysteryTrack } = useRandomTracks(stage)!;
  const { reset: resetPlayer } = usePlayer()!;

  let playerAreaRef: HTMLDivElement;
  let recordRef: HTMLDivElement;

  createEffect(() => {
    const hammerRecord = new Hammer(playerAreaRef, {
      recognizers: [
        [Hammer.Swipe, { direction: Hammer.DIRECTION_UP }],
        [Hammer.Tap],
      ],
    });
    hammerRecord.on('swipe tap', () => {
      checkRecord();
      if (isChecking()) {
        pause();
      } else {
        togglePlayer();
      }
    });
  });

  onMount(() => {
    gameAction.resetGame();
  });

  onCleanup(() => {
    resetPlayer();
  });

  createEffect(() => {
    setIsChecking(false);
    if (stage() > STAGE_COUNT) {
      pause();
      navigate('/game/score');
    }
  });

  const nextStage = () => {
    if (!selected()) {
      return;
    }

    gameAction.addScore({
      correctTrack: mysteryTrack(),
      selectedTrack: selected(),
    });
    setSelected(); // Clear selection
    // TODO mark correct track;
    setStage((prev) => prev + 1);
  };

  const isCorrect = (selectedTrack?: Track) => {
    return mysteryTrack()?.track.id === selectedTrack?.track.id;
  };

  const toggleCoverSelection = (track?: Track) => {
    setSelected((prev) => (prev === track ? undefined : track));
  };

  const slideRecordInside = (complete: () => any) => {
    return anime
      .timeline({
        targets: recordRef,
        complete,
      })
      .add({
        translateY: '-100%',
        duration: 2400,
      })
      .add({
        targets: recordRef,
        translateY: '-125%',
        duration: 1000,
      })
      .add({
        translateY: '100%',
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
        translateY: '-40%',
        duration: 1000,
      })
      .add({
        translateY: '100%',
        duration: 1900,
      });
  };

  const resetRecordPosition = () =>
    anime({
      targets: recordRef,
      translateY: 0,
      delay: 500,
      duration: 2000,
    });

  const checkRecord = () => {
    if (!selected()) {
      return;
    }
    setIsChecking(true);

    const recordAnimation = isCorrect(selected())
      ? slideRecordInside
      : slideRecordOutside;

    recordAnimation(() => {
      nextStage();
      resetRecordPosition();
    });
  };

  const isSelected = (track?: Track) =>
    selected() ? track === selected() : false;

  return (
    <>
      <section className={styles.stage__scroller}>
        <SplashText subtitle={PAGE_TITLE} />
        <section className={styles.stage__coverList}>
          <For each={randomTracks()}>
            {(track, index) => (
              <Cover
                track={track}
                isSelected={isSelected(track)}
                position={index()}
                onClick={toggleCoverSelection}
              />
            )}
          </For>
        </section>
      </section>

      <div ref={playerAreaRef} className={styles.stage__playerControls}>
        <Show when={selected()}>
          <div className={styles.stage__swipeCheckContainer}>
            <Animate type={AnimationType.fadeIn} outCondition={isChecking()}>
              <SplashText subtitle="Swipe up to check" />
            </Animate>
            <Animate type={AnimationType.slideUp} outCondition={isChecking()}>
              {SwipeUpIcon}
            </Animate>
          </div>
        </Show>

        <div ref={recordRef}>
          <Show when={mysteryTrack()}>
            <PlayerControls track={mysteryTrack} />
          </Show>
        </div>
      </div>
    </>
  );
};

export default Stage;
