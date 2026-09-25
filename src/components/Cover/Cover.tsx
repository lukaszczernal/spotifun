import anime from "animejs";
import { Component, onMount, onCleanup, createEffect } from "solid-js";
import { Track } from "../../services/model";
import { COVER_ZOOM_DURATION } from "../../config";

import styles from "./Cover.module.css";

interface Props {
  track?: Track;
  isSelected?: boolean;
  position: number;
  isCorrect: boolean;
  /** Set once the answer is being revealed, to mark this cover green or red. */
  reveal?: "correct" | "wrong";
  onClick: (track: Track | undefined, position: number) => any;
  onLoad: () => any;
}

const transformMap = [
  { translateY: "51%", translateX: "52%" },
  { translateY: "51%", translateX: "-52%" },
  { translateY: "-51%", translateX: "52%" },
  { translateY: "-51%", translateX: "-52%" },
];

const Cover: Component<Props> = (props) => {
  let coverRef: HTMLAnchorElement | undefined;

  const onClickCallback = () => {
    props.onClick(props.track, props.position);
  };

  createEffect(() => {
    if (props.isSelected) {
      anime({
        duration: COVER_ZOOM_DURATION,
        targets: coverRef,
        zIndex: {
          value: 30,
          duration: 0,
        },
        scale: 2.1,
        easing: 'easeOutElastic(1, .9)',
        ...transformMap[props.position],
      });
    } else {
      anime({
        targets: coverRef,
        translateX: "0%",
        translateY: "0%",
        scale: 1,
        easing: 'easeOutElastic(1, .9)',
        zIndex: {
          value: 0,
          duration: 100,
        },
      });
    }
  });

  onMount(() => {
    if (!coverRef) {
      return;
    }

    const hammerCover = new Hammer(coverRef, {
      recognizers: [[Hammer.Tap]],
    });
    hammerCover.on("tap", onClickCallback);

    // destroy(), not off(): off() only clears the handler list, while the
    // manager's input bindings (element pointerdown, window pointermove/up)
    // stay attached and keep this cover alive after it is unmounted.
    onCleanup(() => {
      hammerCover.destroy();
    });
  });

  return (
    <div className={styles.cover__placeholder}>
      <a
        classList={{
          [styles.cover]: true,
          [styles.cover__revealCorrect]: props.reveal === "correct",
          [styles.cover__revealWrong]: props.reveal === "wrong",
          // Unscoped, unstyled: Stage animates `.cover` by selector, and
          // `.cover__correct` is how tests locate the album being played.
          cover: true,
          cover__correct: props.isCorrect,
        }}
        ref={coverRef}
      >
        <img src={props.track?.album.coverBig} onLoad={props.onLoad} />
      </a>
    </div>
  );
};

export default Cover;
