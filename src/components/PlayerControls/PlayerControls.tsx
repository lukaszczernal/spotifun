import { Accessor, Component, createEffect, createMemo } from "solid-js";
import { usePlayer } from "../../services/usePlayer";
import { TrackStageItem } from "../../services/model";
import { VinylRecord } from "../../assets/images/vinylRecord";
import record from "./record.png";

import styles from "./PlayerControls.module.css";

interface Props {
  track: Accessor<TrackStageItem | undefined>;
}

const Player: Component<Props> = ({ track }) => {
  const { state, load, toggle: togglePlay } = usePlayer()!;

  createEffect(() => {
    load(track?.()?.track.previewUrl);
  });

  const getPlayerClass = createMemo(() => {
    const classes = [styles.playerControls__recordWrapper];
    if (state() === "play") {
      classes.push(styles.playerControls__recordWrapper__start);
    }

    if (state() === "pause") {
      classes.push(styles.playerControls__recordWrapper__stop);
    }
    return classes.join(" ");
  });

  return (
    <a className={getPlayerClass()} onClick={togglePlay}>
      <div className={styles.playerControls__record}>
        <img src={record} width="100%" height="100%" />
      </div>

      <div className={styles.playerControls__recordLabelWrapper}>
        <div className={styles.playerControls__recordLabel}>{VinylRecord}</div>
      </div>
    </a>
  );
};

export default Player;
