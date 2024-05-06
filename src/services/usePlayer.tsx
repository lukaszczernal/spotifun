import { Component, createContext, createSignal, useContext } from 'solid-js';

type PlayerContext = ReturnType<typeof getStore>;

export const PlayerContext = createContext<PlayerContext>();
export const PlayerProvider: Component = (props) => (
  <PlayerContext.Provider value={getStore()} children={props.children} />
);

const getStore = () => {
  const [source, setSource] = createSignal<string>();
  const [state, setState] = createSignal<'play' | 'pause'>('pause');
  const [continousPlay, setContinousPlay] = createSignal<boolean>(false);

  const play = () => {
    setContinousPlay(true);
    setState('play');
  };

  const pause = () => {
    setState('pause');
  };

  const toggle = () => {
    state() === 'play' ? pause() : play();
  };

  const load = (sourceUrl?: string) => {
    setSource(sourceUrl);
  };

  /**
   * Prevents from running songs from previous games at start up
   */
  const reset = () => {
    pause();
    load();
    setContinousPlay(false);
  };

  return { state, source, play, pause, load, reset, toggle, continousPlay } as const;
};

export const usePlayer = () => useContext(PlayerContext);
