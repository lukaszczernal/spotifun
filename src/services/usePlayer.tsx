import {
  batch,
  Component,
  createContext,
  createSignal,
  useContext,
} from "solid-js";

type PlayerContext = ReturnType<typeof getStore>;

export const PlayerContext = createContext<PlayerContext>();
export const PlayerProvider: Component = (props) => (
  <PlayerContext.Provider value={getStore()} children={props.children} />
);

const getStore = () => {
  const [source, setSource] = createSignal<string>();
  const [trackId, setTrackId] = createSignal<number>();
  const [state, setState] = createSignal<"play" | "pause">("pause");
  const [continousPlay, setContinousPlay] = createSignal<boolean>(false);

  const play = () => {
    setContinousPlay(true);
    setState("play");
  };

  const pause = () => {
    setState("pause");
  };

  const toggle = () => {
    state() === "play" ? pause() : play();
  };

  /**
   * The track id is kept with the source so that an expired preview URL can be
   * swapped for a fresh one.
   */
  const load = (sourceUrl?: string, id?: number) => {
    batch(() => {
      setSource(sourceUrl);
      setTrackId(id);
    });
  };

  /**
   * Mirrors a change the audio element made on its own - the OS pausing it on
   * screen lock, media keys, a blocked play - without asking the element to act.
   */
  const sync = (newState: "play" | "pause") => {
    setState(newState);
  };

  /**
   * Prevents from running songs from previous games at start up
   */
  const reset = () => {
    pause();
    load();
    setContinousPlay(false);
  };

  return {
    state,
    source,
    trackId,
    play,
    pause,
    sync,
    load,
    reset,
    toggle,
    continousPlay,
  } as const;
};

export const usePlayer = () => useContext(PlayerContext);
