import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  useContext,
} from "solid-js";
import { useNavigate, useParams } from "solid-app-router";
import Hammer from "hammerjs";
import anime from "animejs";
import { PlayerControls } from "../components/PlayerControls";
import { SplashText } from "../components/SplashText";
import { Cover } from "../components/Cover";
import {
  COVER_ZOOM_DURATION,
  REVEAL_DURATION,
  ROUND_LENGTH,
  STAGE_SIZE,
} from "../config";
import { GameContext } from "../services/useGame";
import { usePlayer } from "../services/usePlayer";
import { Track } from "../services/model";
import useTrackStore from "../services/useTrackStore";
import { Animate, AnimationType } from "../components/Animate";
import { slideRecordInside } from "./animations";

import styles from "./Stage.module.css";

const PAGE_TITLE = "Select album cover";

const Stage = () => {
  const navigate = useNavigate();
  const params = useParams();
  const [selected, setSelected] = createSignal<Track>();
  const [isChecking, setIsChecking] = createSignal(false);
  const [wrongTrack, setWrongTrack] = createSignal<Track>();
  const [{ guessCount, scoreCount, failsCount, isRoundOver }, gameAction] =
    useContext(GameContext)!;
  const { pause, toggle: togglePlayer } = usePlayer()!;
  const { stageTracks, mysteryTrack, markAsPlayed, reshuffleStage } =
    useTrackStore({ playlistId: params.playlistId });
  const { reset: resetPlayer, state: playerState, play } = usePlayer()!;

  let playerAreaRef: HTMLDivElement | undefined;
  let recordRef: HTMLDivElement | undefined;
  let revealTimer: ReturnType<typeof setTimeout> | undefined;

  // Only ever one wait is outstanding, so a single handle is enough. Clearing it
  // on unmount leaves the promise unresolved, which stops the resolution chain
  // rather than letting it reshuffle or navigate on a disposed stage.
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      revealTimer = setTimeout(resolve, ms);
    });

  createEffect(() => {
    if (!playerAreaRef) {
      return;
    }

    // The record is only a play/pause control now that picking a cover checks
    // the answer on its own.
    const hammerRecord = new Hammer(playerAreaRef, {
      recognizers: [[Hammer.Tap]],
    });
    hammerRecord.on("tap", () => {
      if (isChecking()) {
        return;
      }
      togglePlayer();
    });

    return () => {
      hammerRecord.destroy();
    };
  });

  onMount(() => {
    gameAction.resetGame();
  });

  onCleanup(() => {
    if (revealTimer !== undefined) {
      clearTimeout(revealTimer);
    }
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
      targets: ".cover",
      opacity: 1,
      delay: anime.stagger(200),
    });
  };

  const isCorrect = (selectedTrack?: Track) => {
    return mysteryTrack()?.track.id === selectedTrack?.id;
  };

  // Picking a cover is terminal - it resolves the guess, so there is no
  // deselecting it again.
  const selectCover = (track: Track | undefined, position: number) => {
    if (isChecking() || !track || !mysteryTrack()) {
      return;
    }
    setSelected(track);
    checkAnswer(track);
  };

  const revealOf = (track?: Track): "correct" | "wrong" | undefined => {
    if (!wrongTrack()) {
      return undefined;
    }
    if (track?.id === wrongTrack()?.id) {
      return "wrong";
    }
    return isCorrect(track) ? "correct" : undefined;
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

  const resetRecordPosition = () =>
    anime({
      targets: recordRef,
      translateY: 0,
      duration: 2000,
    });

  // A miss is shown on the covers, not on the record: the pick zooms in like any
  // other selection, then drops back into the grid so that the green and red
  // borders are readable side by side.
  const revealWrongAnswer = (answeredTrack: Track) =>
    wait(COVER_ZOOM_DURATION).then(() => {
      setSelected();
      setWrongTrack(answeredTrack);
      return wait(REVEAL_DURATION);
    });

  const checkAnswer = (answeredTrack: Track) => {
    if (isChecking() || !recordRef) {
      // TODO isChecking should be substituted with covers loaded
      return;
    }
    setIsChecking(true);
    pause();

    // Capture the question before the stage advances - reshuffleStage() swaps in
    // a new mystery track synchronously, so reading these afterwards would
    // record the next question instead of the one just answered.
    const askedTrack = mysteryTrack()?.track;
    const correct = askedTrack?.id === answeredTrack.id;

    const presented = correct
      ? slideRecordInside(recordRef).finished
      : revealWrongAnswer(answeredTrack);

    presented
      .then(() => {
        gameAction.addScore({
          correctTrack: askedTrack,
          selectedTrack: answeredTrack,
        });

        // Cleared before the stage changes: a wrong track is never retired, so
        // the end of playlist fallback can put it straight back on the new
        // stage, where a leftover border would mark the wrong cover.
        setWrongTrack();

        // The track has been asked about, right or wrong, so it is retired and
        // the stage moves on to a new question. Swapping in a whole new set of
        // covers runs once the answer has finished being shown, so that the
        // preview of the next track does not start playing mid animation.
        markAsPlayed(askedTrack);
        const advanced = reshuffleStage();

        if (isRoundOver() || !advanced) {
          navigate("/game/score");
          return;
        }

        if (!correct) {
          play();
        }
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
          Score: {scoreCount()}
          <br /> Fails: {failsCount()}
          <br /> Guess: {guessCount()} / {ROUND_LENGTH}
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
                reveal={revealOf(track.track)}
                position={index()}
                onClick={selectCover}
                onLoad={() => console.log("register image loaded")}
              />
            )}
          </For>
        </section>
      </section>

      <div ref={playerAreaRef} className={styles.stage__playerControls}>
        <Show
          when={
            playerState() === "pause" &&
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
