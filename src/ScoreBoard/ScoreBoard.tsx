import { For, useContext } from 'solid-js';
import { Button } from '../components/Button';
import { Footer } from '../components/Footer';
import { SplashText } from '../components/SplashText';
import { ROUND_LENGTH } from '../config';
import { isCorrect } from '../services/gameUtils';
import { GameContext } from '../services/useGame';

import styles from './ScoreBoard.module.css';

const ScoreBoard = () => {
  const [{ gameScore, scoreCount, playlistId }] = useContext(GameContext)!;

  // Another round of the same playlist, so progress keeps building up. Falls
  // back to the game list if the playlist is unknown - a reload lands here with
  // an empty store.
  const replayHref = () =>
    playlistId() ? `/game/${playlistId()}` : '/gamelist';

  return (
    <>
      <SplashText multiline={['Your score', `${scoreCount()} / ${ROUND_LENGTH}`]} />
      <ul className={styles.scoreBoard}>
        <For each={gameScore.answers}>
          {(score) => (
            <li className={styles.scoreBoard__response}>
              <section className={styles.scoreBoard__card}>
                {/* Always show the right answer, so a missed song is revealed. */}
                <img
                  width={64}
                  height={64}
                  src={score.correctTrack?.album.coverMedium}
                />
                <div className={styles.scoreBoard__songInfo}>
                  <span className={styles.scoreBoard__songTitle}>
                    {score.correctTrack?.name}
                  </span>
                  <span className={styles.scoreBoard__songArtists}>
                    {score.correctTrack?.artist}
                  </span>
                </div>
                <span
                  className={`${styles.scoreBoard__tag} ${
                    isCorrect(score) ? '' : styles.scoreBoard__tagMissed
                  }`}
                >
                  {isCorrect(score) ? 'Correct' : 'Missed'}
                </span>
              </section>
            </li>
          )}
        </For>
      </ul>

      <Footer>
        <Button href={replayHref()} dark>
          One more round
        </Button>
      </Footer>
    </>
  );
};

export default ScoreBoard;
