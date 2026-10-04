import { Show } from "solid-js";
import { Link } from "solid-app-router";
import favouritesCover from "../assets/images/game-list-covers/your-favourites.jpg";
import { useProgress } from "../services/useProgress";
import styles from "./GameList.module.css";

interface TileProps {
  id: string;
  key: number;
  title: string;
  imageUrl: string;
  // Accessors rather than values, so a tile re-renders its progress as soon as
  // the player comes back from a round.
  percent: () => number;
  completed: () => boolean;
}

const Tile = (props: TileProps) => {
  return (
    <Link className={styles.tile} href={`/game/${props.id}`}>
      <img src={props.imageUrl} alt={props.title} className={styles.tileImage} />
      <Show when={props.completed()}>
        <span className={styles.tileBadge}>Complete</span>
      </Show>
      <div className={styles.tileContent}>
        <h3 className={styles.tileTitle}>{props.title}</h3>
        <p className={styles.tileProgress}>{props.percent()}% guessed</p>
      </div>
    </Link>
  );
};

const GameList = () => {
  const [{ progressOf }] = useProgress();
  const tiles = [
    {
      id: "394652815",
      title: "Your favourites",
      imageUrl: favouritesCover,
    },
    {
      id: "9010236822",
      title: "00's Jazz",
      imageUrl:
        "https://cdn-images.dzcdn.net/images/playlist/97a9dddf8d1b8d73fce5d6005ba58436/500x500-000000-80-0-0.jpg",
    },
    {
      id: "67784289",
      title: "2010",
      imageUrl:
        "https://cdn-images.dzcdn.net/images/cover/a3e008fd70c27ad84c004d687f36a5ac-8d5daa968fcc87906e86b1b92048a626-f1fbb5f9b717e6eb0d7c222f1ed039ca-58a732633fa81669bd546c208f4f6699/800x800-000000-80-0-0.jpg",
    },
  ];

  return (
    <div className={styles.gameList}>
      {tiles.map((tile, index) => (
        <Tile
          key={index}
          id={tile.id}
          title={tile.title}
          imageUrl={tile.imageUrl}
          percent={() => progressOf(tile.id).percent}
          completed={() => progressOf(tile.id).completed}
        />
      ))}
    </div>
  );
};

export default GameList;
