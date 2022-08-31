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
import { MAX_FAIL_COUNT, STAGE_SIZE } from '../config';
import { GameContext } from '../services/useGame';
import { usePlayer } from '../services/usePlayer';
import { Track } from '../services/model';
import useTrackStore from '../services/useTrackStore';
import { Animate, AnimationType } from '../components/Animate';
import { SwipeUpIcon } from '../assets/gestureIcons';

import styles from './Stage.module.css';

const PAGE_TITLE = 'Select album cover';

const Stage = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = createSignal<Track>();
  const [isChecking, setIsChecking] = createSignal(false);
  const [{ failsCount }, gameAction] = useContext(GameContext)!;
  const { pause, toggle: togglePlayer } = usePlayer()!;
  const { stageTracks, mysteryTrack, trackCount, guessedCount, markAsGuessed } =
    useTrackStore()!;
  const { reset: resetPlayer, state: playerState, play } = usePlayer()!;

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
    // When first tracks are loaded
    if (stageTracks()[STAGE_SIZE - 1] !== undefined) {
      showCovers();
    }
  });

  // TODO reuse to hide single cover
  // const hideCovers = () => {
  //   return anime({
  //     targets: '.cover',
  //     opacity: 0,
  //     delay: anime.stagger(200, { start: 300 }),
  //   });
  // };

  const showCovers = () => {
    // TODO preload images
    return anime({
      targets: '.cover',
      opacity: 1,
      delay: anime.stagger(200),
    });
  };

  const isCorrect = (selectedTrack?: Track) => {
    return mysteryTrack()?.track.id === selectedTrack?.id;
  };

  const toggleCoverSelection = (track: Track | undefined, position: number) => {
    if (isChecking()) {
      return;
    }
    setSelected((prev) => (prev === track ? undefined : track));
  };

  // const markCorrect = () => {
  //   return anime({
  //     targets: '.cover__correct',
  //     keyframes: [
  //       { rotate: '10deg' },
  //       { rotate: '-10deg' },
  //       { rotate: '0deg' },
  //       { rotate: '0deg', delay: 1000 },
  //     ],
  //     delay: 400,
  //     duration: 500,
  //   });
  // };

  const slideRecordInside = () => {
    return anime
      .timeline({
        targets: recordRef,
        easing: 'easeOutExpo',
      })
      .add({
        translateY: '-100%',
        duration: 1400,
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

  const slideRecordOutside = () => {
    return anime
      .timeline({
        targets: recordRef,
        easing: 'easeOutExpo',
      })
      .add({
        translateY: '-30%',
        duration: 800,
      });
  };

  const resetRecordPosition = () =>
    anime({
      targets: recordRef,
      translateY: 0,
      duration: 2000,
    });

  const checkRecord = () => {
    if (!selected() || isChecking()) {
      // TODO isChecking should be substituted with covers loaded
      return;
    }
    setIsChecking(true);

    const recordAnimation = isCorrect(selected())
      ? slideRecordInside
      : slideRecordOutside;

    recordAnimation()
      .finished.then(() => {
        if (failsCount() === MAX_FAIL_COUNT) {
          navigate('/game/score');
        } else {
          play();
        }
      })
      .then(() => {
        if (isCorrect(selected())) {
          markAsGuessed(selected());
        }
      })
      .then(() => {
        // TODO
        // gameAction.addScore({
        //   correctTrack: mysteryTrack(),
        //   selectedTrack: selected(),
        // });
      })
      .then(() => {
        setSelected(); // Clear selection
        setIsChecking(false);
        resetRecordPosition();
      });
  };

  const isSelected = (track?: Track) =>
    selected() ? track === selected() : false;

  return (
    <>
      <div className={styles.stage__score}>
        <span>
          Score: {guessedCount()}
          <br /> Fails: {failsCount()}
          <br /> Total: {trackCount()}
        </span>
      </div>
      <section className={styles.stage__scroller}>
        <Animate
          type={AnimationType.fadeIn}
          outCondition={!!selected() || !!isChecking()}
        >
          <SplashText subtitle={PAGE_TITLE} />
        </Animate>

        <section className={styles.stage__coverList}>
          <For each={stageTracks()}>
            {(track, index) => (
              <Cover
                track={track.track}
                isSelected={isSelected(track.track)}
                isCorrect={isCorrect(track.track)}
                position={index()}
                onClick={toggleCoverSelection}
                onLoad={() => console.log('register image loaded')}
              />
            )}
          </For>
        </section>
      </section>

      <div ref={playerAreaRef} className={styles.stage__playerControls}>
        <Show
          when={
            playerState() === 'pause' &&
            stageTracks().length > 0 &&
            !selected() &&
            !isChecking()
          }
        >
          <div className={styles.stage__recordAction}>
            <Animate type={AnimationType.fadeIn} outCondition={isChecking()}>
              <SplashText subtitle="Tap to play" />
            </Animate>
          </div>
        </Show>

        <Show when={selected()}>
          <div className={styles.stage__recordAction}>
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
