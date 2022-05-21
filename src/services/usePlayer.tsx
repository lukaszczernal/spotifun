import { Component, createContext, createSignal, useContext } from 'solid-js';

type PlayerContext = ReturnType<typeof getStore>;

export const PlayerContext = createContext<PlayerContext>();
export const PlayerProvider: Component = (props) => (
  <PlayerContext.Provider value={getStore()} children={props.children} />
);

const getStore = () => {
  const [source, setSource] = createSignal<string>();
  const [state, setState] = createSignal<'play' | 'pause'>('pause');

  const play = () => {
    setState('play');
  };

  const pause = () => {
    setState('pause');
  };

  const load = (sourceUrl?: string) => {
    sourceUrl && setSource(sourceUrl);
  };

  /**
   * Prevents from running songs from previous games at start up
   */
  const clear = () => {
    pause();
    load();
  };

  return { state, source, play, pause, load, clear } as const;
};

export const usePlayer = () => useContext(PlayerContext);
