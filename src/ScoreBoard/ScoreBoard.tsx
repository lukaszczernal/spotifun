import { For, Show, useContext } from 'solid-js';
import { Button } from '../components/Button';
import { Footer } from '../components/Footer';
import { SplashText } from '../components/SplashText';
import { GameContext, Score } from '../services/useGame';

import styles from './ScoreBoard.module.css';

const ScoreBoard = () => {
  const [{ gameScore }, { startGame }] = useContext(GameContext)!;

  const isCorrect = (score: Score) => {
    const { correctTrack, selectedTrack } = score;
    return correctTrack?.track.id === selectedTrack?.track.id;
  };

  const correctCount = () => gameScore.answers.filter(isCorrect).length;

  return (
    <>
      <SplashText>Your score: {correctCount()}/3</SplashText>
      <ul className={styles.scoreBoard}>
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

      <Footer>
        <Button href="" onClick={startGame}>
          One more round
        </Button>
      </Footer>
    </>
  );
};

export default ScoreBoard;
