import { Link } from 'solid-app-router';
import { For, Show, useContext } from 'solid-js';
import { GameContext, Score } from '../services/useGame';

const ScoreBoard = () => {
  const [{ gameScore }, { startGame }] = useContext(GameContext)!;

  const isCorrect = (score: Score) => {
    const { correctTrack, selectedTrack } = score;
    return correctTrack?.track.id === selectedTrack?.track.id;
  };

  const correctCount = () => gameScore.answers.filter(isCorrect).length;

  return (
    <>
      <h1>Your score: {correctCount()}/3</h1>
      <ul>
        <For each={gameScore.answers}>
          {(score) => (
            <li>
              <p>Guessed? {isCorrect(score) ? 'Yes' : 'No'}</p>
              {score.correctTrack?.track.name} -{' '}
              {score.correctTrack?.track.artists
                .map((artist) => artist.name)
                .join(',')}
              <Show when={!isCorrect(score)}>
                <p>you thought it was:</p>
                {score.selectedTrack?.track.name} -{' '}
                {score.selectedTrack?.track.artists
                  .map((artist) => artist.name)
                  .join(',')}
              </Show>
            </li>
          )}
        </For>
      </ul>
      <button onClick={startGame}>
        One more round
      </button>
    </>
  );
};

export default ScoreBoard;
