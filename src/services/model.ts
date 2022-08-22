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

export interface Track extends ExternalURL {
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
  };

export interface Tracks {
  href: string;
  items: TrackItem[];
  limit: number;
  next: string;
  offset: number;
  previous: string;
  total: number;
}

interface TrackItem {
  added_at: string;
  track: Track;
}

export interface Playlist {
  collaborative: boolean;
  description: string;
  external_urls: {
    spotify: string;
  };
  followers: {
    href: string;
    total: 0;
  };
  href: string;
  id: string;
  images: [
    {
      url: string;
      height: 300;
      width: 300;
    }
  ];
  name: string;
  owner: {
    external_urls: {
      spotify: string;
    };
    followers: {
      href: string;
      total: 0;
    };
    href: string;
    id: string;
    type: 'user';
    uri: string;
    display_name: string;
  };
  public: true;
  snapshot_id: string;
  tracks: {
    href: string;
    items: TrackItem[];
    limit: 20;
    next: string;
    offset: 0;
    previous: string;
    total: 4;
  };
  type: string;
  uri: string;
}
