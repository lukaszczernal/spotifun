
type ImageSize = 640 | 300 | 64;

interface TrackImage {
  height: ImageSize;
  url: string;
  width: ImageSize;
}

interface ExternalURL {
  external_urls: {
    spotify: string;
  };
}

export interface Track {
  added_at: string;
  track: {
    album: {
      album_type: string;
      artists: Array<
        {
          href: string;
          id: string;
          name: string;
          type: string;
          uri: string;
        } & ExternalURL
      >;
      available_markets: string[];
      href: string;
      id: string;
      images: TrackImage[];
      name: string;
      release_date: string;
      release_date_precision: string;
      total_tracks: number;
      type: string;
      uri: string;
    } & ExternalURL;
    artists: Array<
      {
        href: string;
        id: string;
        name: string;
        type: string;
        uri: string;
      } & ExternalURL
    >;
    available_markets: string[];
    disc_number: number;
    duration_ms: number;
    explicit: boolean;
    external_ids: { isrc: string };
    href: string;
    id: string;
    is_local: boolean;
    name: string;
    popularity: number;
    preview_url: string;
    track_number: number;
    type: string;
    uri: string;
  } & ExternalURL;
}

export interface Tracks {
  href: string;
  items: Track[];
  limit: number;
  next: string;
  offset: number;
  previous: string;
  total: number;
}