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
  /** Open only while a miss is being shown. It is what promotes `isCorrect`
   * into the grow and shake, so that `isCorrect` does not give the answer away
   * for the rest of the round. */
  isRevealing?: boolean;
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

  // The miss is shown here, not on the pick: the correct cover grows and
  // wobbles in place. Kept in its own effect so the selection reset above
  // cannot animate the same element at the same time, and so that leaving the
  // reveal always puts the cover back - the stage's <For> is unkeyed, so this
  // node is reused by the next round.
  createEffect(() => {
    // Both read up front, not short-circuited: Solid only re-runs this effect
    // for the props it actually read.
    const isRevealing = props.isRevealing;
    const isCorrect = props.isCorrect;

    if (isRevealing && isCorrect) {
      anime({
        targets: coverRef,
        zIndex: {
          value: 20,
          duration: 0,
        },
        scale: 1.3,
        keyframes: [
          { rotate: "10deg" },
          { rotate: "-10deg" },
          { rotate: "6deg" },
          { rotate: "0deg" },
        ],
        duration: 600,
        easing: "easeInOutSine",
      });
    } else {
      anime({
        targets: coverRef,
        scale: 1,
        rotate: "0deg",
        duration: 200,
        easing: "easeInOutSine",
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
