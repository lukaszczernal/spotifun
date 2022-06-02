import { Component, createContext } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Track } from './useTracks';

export interface Score {
  correctTrack?: Track;
  selectedTrack?: Track;
}

type GameContext = ReturnType<typeof getStore>;

export const GameContext = createContext<GameContext>();
export const GameProvider: Component = (props) => (
  <GameContext.Provider value={getStore()} children={props.children} />
);

const getStore = () => {
  const [gameScore, setGameScore] = createStore<{ answers: Score[] }>({
    answers: [],
  });

  const addScore = (score: Score) => {
    setGameScore('answers', (state) => [...state, score]);
  };

  const resetGame = () => {
    setGameScore('answers', []);
  };

  return [{ gameScore }, { addScore, resetGame }] as const;
};
