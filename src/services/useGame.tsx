import { Component, createContext, createSignal } from 'solid-js';
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
  const [stage, setStage] = createSignal(0);

  const nextStage = (score: Score) => {
    setGameScore('answers', (state) => [...state, score]);
    setStage((prev) => prev + 1);
  };

  const startGame = () => {
    setGameScore('answers', []);
    setStage(1);
  };

  const exitGame = () => {
    setGameScore('answers', []);
    setStage(0);
  };

  return [
    { stage, gameScore },
    { nextStage, startGame, exitGame },
  ] as const;
};
