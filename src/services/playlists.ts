import favouritesCover from "../assets/images/game-list-covers/your-favourites.jpg";

export interface PlaylistSummary {
  id: string;
  title: string;
  imageUrl: string;
}

/**
 * The playlists on offer, in progression order: finishing one unlocks the next.
 * Both the game list and the stage route guard read this single ordered list,
 * since "the next playlist" only means anything against an order.
 */
export const PLAYLISTS: PlaylistSummary[] = [
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
