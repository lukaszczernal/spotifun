import { Link } from "solid-app-router";
import favouritesCover from "../assets/images/game-list-covers/your-favourites.jpg";
import styles from "./GameList.module.css";

interface TileProps {
  id: string;
  key: number;
  title: string;
  imageUrl: string;
}

const Tile = ({ title, imageUrl, id }: TileProps) => {
  return (
    <Link className={styles.tile} href={`/game/${id}`}>
      <img src={imageUrl} alt={title} className={styles.tileImage} />
      <div className={styles.tileContent}>
        <h3 className={styles.tileTitle}>{title}</h3>
      </div>
    </Link>
  );
};

const GameList = () => {
  const tiles = [
    {
      id: "394652815",
      title: "Your favourites",
      imageUrl: favouritesCover,
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
        />
      ))}
    </div>
  );
};

export default GameList;
