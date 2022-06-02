import { useNavigate } from 'solid-app-router';
import { For, useContext } from 'solid-js';
import { Button } from '../components/Button';
import { Footer } from '../components/Footer';
import { SplashText } from '../components/SplashText';
import { STAGE_COUNT } from '../config';
import { countCorrect, isCorrect } from '../services/gameUtils';
import { GameContext } from '../services/useGame';

import styles from './ScoreBoard.module.css';

const ScoreBoard = () => {
  const navigate = useNavigate();
  const [{ gameScore }, { resetGame }] = useContext(GameContext)!;
  const score = () => countCorrect(gameScore.answers);

  return (
    <>
      <SplashText multiline={['Your score', `${score()}/${STAGE_COUNT}`]} />
      <ul className={styles.scoreBoard}>
        <For each={gameScore.answers}>
          {(score, index) => (
            <li className={styles.scoreBoard__response}>
              <section className={styles.scoreBoard__card}>
                <img
                  width={64}
                  height={64}
                  src={score.correctTrack?.track.album.images[2].url}
                />
                <div className={styles.scoreBoard__songInfo}>
                  <span className={styles.scoreBoard__songTitle}>
                    {score.correctTrack?.track.name}
                  </span>
                  <span className={styles.scoreBoard__songArtists}>
                    {score.correctTrack?.track.artists
                      .map((artist) => artist.name)
                      .join(',')}
                  </span>
                </div>
                <span className={styles.scoreBoard__tag}>
                  {isCorrect(score) ? 'Correct' : ''}
                </span>
              </section>
            </li>
          )}
        </For>
      </ul>

      <Footer>
        <Button href="/game" dark>
          One more round
        </Button>
      </Footer>
    </>
  );
};

export default ScoreBoard;
