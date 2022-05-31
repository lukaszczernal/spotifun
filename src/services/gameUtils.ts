import { Score } from './useGame';

export const isCorrect = (score: Score) => {
  const { correctTrack, selectedTrack } = score;
  return correctTrack?.track.id === selectedTrack?.track.id;
};

export const countCorrect = (answers: Score[]) => answers.filter(isCorrect).length;