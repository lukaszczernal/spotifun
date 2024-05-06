import { useNavigate } from 'solid-app-router';
import { createEffect, Show } from 'solid-js';
import { SwipeUpIcon } from '../assets/images/gestureIcons';
import { Animate, AnimationType } from '../components/Animate';
import { Button } from '../components/Button';
import { Footer } from '../components/Footer';
import { SplashText } from '../components/SplashText';
import { useAuth } from '../services/useAuth';

import styles from './Splash.module.css';

const Splash = () => {
  const { isAuthenticated, login } = useAuth()!;
  const navigate = useNavigate();

  let startRef: HTMLDivElement;

  createEffect(() => {
    if (!startRef) {
      return;
    }
    const hammerStart = new Hammer(startRef, {
      recognizers: [
        [Hammer.Swipe, { direction: Hammer.DIRECTION_UP }],
        [Hammer.Tap],
      ],
    });
    hammerStart.on('swipe tap', () => navigate('/game'));
  });

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
          <div ref={startRef} className={styles.splash__swipeStart}>
            <Animate type={AnimationType.fadeIn}>
              <SplashText subtitle="Swipe up start" />
            </Animate>
            <Animate type={AnimationType.slideUp}>{SwipeUpIcon}</Animate>
          </div>
        </Show>
      </Footer>
    </>
  );
};

export default Splash;
