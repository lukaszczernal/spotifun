import { Component, createContext, createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Track } from './useTracks';

interface Score {
  correctTrack?: Track;
  selectedTrack?: Track;
}

type GameContext = ReturnType<typeof getStore>;

export const GameContext = createContext<GameContext>();
export const GameProvider: Component = (props) => (
  <GameContext.Provider value={getStore()} children={props.children} />
);

const getStore = () => {
  const [gameScore, setGameScore] = createStore<Score[]>([]);
  const [stage, setStage] = createSignal(0);

  const nextStage = (score: Score) => {
    setGameScore((state) => [...state, score]);
    setStage(prev => prev + 1);
  };

  const startGame = () => setStage(1);

  return [{ stage }, { nextStage, startGame }] as const;
};
