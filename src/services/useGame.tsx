import { Component, createContext } from 'solid-js';
import { createStore } from 'solid-js/store';
import { ROUND_LENGTH } from '../config';
import { countCorrect } from './gameUtils';
import { Track } from './model';

export interface Score {
  correctTrack?: Track;
  selectedTrack?: Track;
}

type GameContext = ReturnType<typeof getStore>;

export const GameContext = createContext<GameContext>();
export const GameProvider: Component = (props) => (
  <GameContext.Provider value={getStore()} children={props.children} />
);

export const getStore = () => {
  const [gameScore, setGameScore] = createStore<{ answers: Score[] }>({
    answers: [],
  });

  const guessCount = () => gameScore.answers.length;
  const scoreCount = () => countCorrect(gameScore.answers);
  const failsCount = () => guessCount() - scoreCount();
  const isRoundOver = () => guessCount() >= ROUND_LENGTH;

  const addScore = (score: Score) => {
    // A round is a fixed number of guesses. Late animation callbacks must not
    // be able to append an extra answer once the round is over.
    if (isRoundOver()) return;
    setGameScore('answers', (state) => [...state, score]);
  };

  const resetGame = () => {
    setGameScore('answers', []);
  };

  return [
    { gameScore, guessCount, scoreCount, failsCount, isRoundOver },
    { addScore, resetGame },
  ] as const;
};
