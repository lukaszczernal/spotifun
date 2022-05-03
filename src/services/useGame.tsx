import { Component, createContext, createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Track } from './useTracks';

interface Score {
  correctTrack?: Track;
  selectedTrack?: Track;
}

type GameContext = ReturnType<typeof getStore>;

const FINAL_STAGE = 3;
export const GameContext = createContext<GameContext>();
export const GameProvider: Component = (props) => (
  <GameContext.Provider value={getStore()} children={props.children} />
);

const getStore = () => {
  const [gameScore, setGameScore] = createStore<Score[]>([]);

  const currentStage = () => gameScore.length + 1;

  const nextStage = (score: Score) => {
    if (currentStage() >= FINAL_STAGE) {
      return;
    }
    setGameScore((state) => [...state, score]);
  };

  return [{ currentStage }, { nextStage }] as const;
};
