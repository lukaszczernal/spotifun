import { Show } from "solid-js";
import { Link } from "solid-app-router";
import { PLAYLISTS } from "../services/playlists";
import { useProgress } from "../services/useProgress";
import styles from "./GameList.module.css";

interface TileProps {
  id: string;
  key: number;
  title: string;
  imageUrl: string;
  // Accessors rather than values, so a tile re-renders its progress - and opens
  // up - as soon as the player comes back from a round.
  percent: () => number;
  completed: () => boolean;
  unlocked: () => boolean;
}

/**
 * A locked playlist renders as a plain element rather than a Link with the
 * click swallowed, so the browser never offers its url at all. The share
 * guessed is left off: a playlist that has never been open can only read 0%.
 */
const LockedTile = (props: TileProps) => (
  <div className={`${styles.tile} ${styles.tileLocked}`} aria-disabled="true">
    <img src={props.imageUrl} alt={props.title} className={styles.tileImage} />
    <span className={`${styles.tileBadge} ${styles.tileBadgeLocked}`}>
      Locked
    </span>
    <div className={styles.tileContent}>
      <h3 className={styles.tileTitle}>{props.title}</h3>
    </div>
  </div>
);

const Tile = (props: TileProps) => {
  return (
    <Show when={props.unlocked()} fallback={<LockedTile {...props} />}>
      <Link className={styles.tile} href={`/game/${props.id}`}>
        <img
          src={props.imageUrl}
          alt={props.title}
          className={styles.tileImage}
        />
        <Show when={props.completed()}>
          <span className={styles.tileBadge}>Complete</span>
        </Show>
        <div className={styles.tileContent}>
          <h3 className={styles.tileTitle}>{props.title}</h3>
          <p className={styles.tileProgress}>{props.percent()}% guessed</p>
        </div>
      </Link>
    </Show>
  );
};

const GameList = () => {
  const [{ progressOf, isUnlocked }] = useProgress();

  return (
    <div className={styles.gameList}>
      {PLAYLISTS.map((tile, index) => (
        <Tile
          key={index}
          id={tile.id}
          title={tile.title}
          imageUrl={tile.imageUrl}
          percent={() => progressOf(tile.id).percent}
          completed={() => progressOf(tile.id).completed}
          unlocked={() => isUnlocked(tile.id)}
        />
      ))}
    </div>
  );
};

export default GameList;
