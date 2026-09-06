import styles from "./GameList.module.css";

interface TileProps {
  id: string;
  key: number;
  title: string;
  imageUrl: string;
  loginRequired?: boolean;
}

const Tile = ({ title, imageUrl, loginRequired, id }: TileProps) => {
  return (
    <a className={styles.tile} href={`/game/${id}`}>
      <img src={imageUrl} alt={title} className={styles.tileImage} />
      <div className={styles.tileContent}>
        {loginRequired && <div className={styles.badge}>Login Required</div>}
        <h3 className={styles.tileTitle}>{title}</h3>
      </div>
    </a>
  );
};

const GameList = () => {
  const tiles = [
    {
      id: "90s",
      title: "90s",
      imageUrl: "/src/assets/images/game-list-covers/90s.jpg",
    },
    {
      id: "hiphop-anthems",
      title: "HipHop Anthems",
      imageUrl: "/src/assets/images/game-list-covers/hip-hop-anthems.jpg",
    },
    {
      id: "2010s-radio-hits",
      title: "2010s radio hits",
      imageUrl: "/src/assets/images/game-list-covers/2010-radio-hits.jpg",
    },
    {
      id: "favourites",
      title: "Your favourites",
      imageUrl: "/src/assets/images/game-list-covers/your-favourites.jpg",
      loginRequired: true,
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
          loginRequired={tile.loginRequired}
        />
      ))}
    </div>
  );
};

export default GameList;
