export interface DeezerTrack {
  id: number;
  title: string;
  preview: string;
  readable: boolean;
  artist: { id: number; name: string };
  album: {
    id: number;
    title: string;
    cover_medium: string;
    cover_big: string;
  };
}

export interface DeezerPlaylist {
  id: number;
  title: string;
  nb_tracks: number;
  tracks: { data: DeezerTrack[]; next?: string };
}

export interface DeezerError {
  error?: { type: string; message: string; code: number };
}

export interface Track {
  id: number;
  name: string;
  previewUrl: string;
  artist: string;
  album: {
    id: number;
    name: string;
    coverMedium: string;
    coverBig: string;
  };
}

export interface TrackStageItem {
  track: Track;
  guessed: boolean;
  staged: boolean;
}
