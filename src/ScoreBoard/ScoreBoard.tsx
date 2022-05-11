import { For, useContext } from 'solid-js';
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
          {(score, index) => (
            <li className={styles.scoreBoard__response}>
              <div className={styles.scoreBoard__responseTitle}>
                <h3>Stage {index() + 1}</h3>
                <small>{isCorrect(score) ? 'Correct' : ''}</small>
              </div>
              <section className={styles.scoreBoard__card}>
                <img
                  width={64}
                  height={64}
                  src={score.correctTrack?.track.album.images[2].url}
                />
                <div className={styles.scoreBoard__songInfo}>
                  <p>{score.correctTrack?.track.name}</p>
                  <p>
                    {score.correctTrack?.track.artists
                      .map((artist) => artist.name)
                      .join(',')}
                  </p>
                </div>
              </section>
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
