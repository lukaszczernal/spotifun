import { Score } from './useGame';

export const isCorrect = ({ correctTrack, selectedTrack }: Score) =>
  correctTrack !== undefined && correctTrack.id === selectedTrack?.id;

export const countCorrect = (answers: Score[]) => answers.filter(isCorrect).length;
