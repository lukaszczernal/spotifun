import anime from "animejs";
import { Component, onMount, onCleanup, createEffect } from "solid-js";
import { Track } from "../../services/model";

import styles from "./Cover.module.css";

interface Props {
  track?: Track;
  isSelected?: boolean;
  position: number;
  isCorrect: boolean;
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
  let coverRef: HTMLAnchorElement;

  const onClickCallback = () => {
    console.log("!! cover clicked");
    props.onClick(props.track, props.position);
  };

  createEffect(() => {
    if (props.isSelected) {
      anime({
        targets: coverRef,
        zIndex: {
          value: 30,
          duration: 0,
        },
        scale: 2.1,
        ...transformMap[props.position],
      });
    } else {
      anime({
        targets: coverRef,
        translateX: "0%",
        translateY: "0%",
        scale: 1,
        zIndex: {
          value: 0,
          duration: 100,
        },
      });
    }
  });

  onMount(() => {
    new Hammer(coverRef, {
      recognizers: [[Hammer.Tap]],
    }).on("tap", onClickCallback);
  });

  onCleanup(() => {
    console.log("TODO check if remove works if game ends");
    Hammer.off(coverRef, "tap", onClickCallback);
  });

  return (
    <div className={styles.cover__placeholder}>
      <a
        className={styles.cover}
        class={`cover ${props.isCorrect ? "cover__correct" : ""}`} // TODO I do not like this solution
        ref={coverRef}
      >
        <img src={props.track?.album.images[0].url} onLoad={props.onLoad} />
      </a>
    </div>
  );
};

export default Cover;
