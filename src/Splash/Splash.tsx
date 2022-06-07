import { Show } from 'solid-js';
import { Button } from '../components/Button';
import { Footer } from '../components/Footer';
import { SplashText } from '../components/SplashText';
import { useAuth } from '../services/useAuth';

import styles from './Splash.module.css';

const Splash = () => {
  const { isAuthenticated, login } = useAuth()!;

  return (
    <>
      <section className={styles.splash__title}>
        <SplashText subtitle="of your favourite songs">
          Guess cover albums
        </SplashText>
      </section>
      <Footer>
        <Show
          when={isAuthenticated()}
          fallback={
            <Button href="" onClick={login}>
              Login to Spotify
            </Button>
          }
        >
          <Button href="/game">
            Start
          </Button>
        </Show>
      </Footer>
    </>
  );
};

export default Splash;
