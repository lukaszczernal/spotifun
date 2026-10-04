import { Component, createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { ROUND_LENGTH } from "../config";

export interface PlaylistProgress {
  /** Distinct track ids the player has guessed correctly. */
  guessed: number[];
  /** 0-100, recomputed when the playlist is entered and on every new guess. */
  percent: number;
  /** Sticky once earned - never cleared, even if `percent` later drops. */
  completed: boolean;
  /** Playable track count seen the last time the playlist was entered. */
  playableCount: number;
}

/** A playlist is finished once the player has guessed more than this share. */
const COMPLETION_THRESHOLD = 80;

const emptyProgress: PlaylistProgress = {
  guessed: [],
  percent: 0,
  completed: false,
  playableCount: 0,
};

type ProgressContext = ReturnType<typeof getStore>;

export const ProgressContext = createContext<ProgressContext>();
export const ProgressProvider: Component = (props) => (
  <ProgressContext.Provider value={getStore()} children={props.children} />
);

/**
 * How far the player has got through each playlist, keyed by playlist id.
 *
 * Progress lives for as long as the app is open and is deliberately not
 * persisted - a reload starts over. The store is mounted above the router, so
 * it survives moving between the game list, a stage and the score board.
 */
export const getStore = () => {
  const [progress, setProgress] = createStore<Record<string, PlaylistProgress>>(
    {},
  );

  /**
   * Guessed songs are counted against the playable track count, so the share
   * cannot exceed 100% if the playlist came back smaller than it was when the
   * guesses were made - a preview dropping out of the region, say.
   */
  const toPercent = (entry: PlaylistProgress) =>
    entry.playableCount > 0
      ? Math.round(
          (Math.min(entry.guessed.length, entry.playableCount) /
            entry.playableCount) *
            100,
        )
      : 0;

  const progressOf = (playlistId: string): PlaylistProgress =>
    progress[playlistId] ?? emptyProgress;

  const guessedIds = (playlistId: string) => progressOf(playlistId).guessed;

  /**
   * Applies a change to a playlist's entry, creating it first if the playlist
   * has not been seen yet, then recalculates the share guessed. `completed` is
   * only ever raised, never lowered: once a playlist has been finished it stays
   * finished, even if it later grows and the share drops back below the mark.
   */
  const update = (
    playlistId: string,
    change: (entry: PlaylistProgress) => PlaylistProgress,
  ) => {
    const current = progressOf(playlistId);
    const changed = change(current);
    const percent = toPercent(changed);

    setProgress(playlistId, {
      ...changed,
      percent,
      completed: changed.completed || percent > COMPLETION_THRESHOLD,
    });
  };

  /**
   * Called when the player enters a playlist and the playable track count is
   * known. Only the denominator moves - the songs already guessed and a
   * playlist already finished are left alone.
   */
  const syncPlaylist = (playlistId: string, playableCount?: number) => {
    if (!playlistId || !playableCount) return;
    update(playlistId, (entry) => ({ ...entry, playableCount }));
  };

  /** Records a correct guess. Guessing the same song twice changes nothing. */
  const recordGuess = (playlistId: string, trackId?: number) => {
    if (!playlistId || trackId === undefined) return;
    update(playlistId, (entry) =>
      entry.guessed.includes(trackId)
        ? entry
        : { ...entry, guessed: [...entry.guessed, trackId] },
    );
  };

  /** A faultless round finishes a playlist however much of it is left. */
  const completeRound = (playlistId: string, correctCount: number) => {
    if (!playlistId || correctCount < ROUND_LENGTH) return;
    update(playlistId, (entry) => ({ ...entry, completed: true }));
  };

  return [
    { progress, progressOf, guessedIds },
    { syncPlaylist, recordGuess, completeRound },
  ] as const;
};

export const useProgress = () => useContext(ProgressContext)!;
