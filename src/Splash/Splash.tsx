import { useNavigate } from 'solid-app-router';
import { createEffect } from 'solid-js';
import { SwipeUpIcon } from '../assets/images/gestureIcons';
import { Animate, AnimationType } from '../components/Animate';
import { Footer } from '../components/Footer';
import { SplashText } from '../components/SplashText';

import styles from './Splash.module.css';

const Splash = () => {
  const navigate = useNavigate();

  let startRef: HTMLDivElement | undefined;

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
    hammerStart.on('swipe tap', () => navigate('/gamelist'));

    return () => {
      hammerStart.destroy();
    };
  });

  return (
    <>
      <section className={styles.splash__title}>
        <SplashText subtitle="of your favourite songs">
          Guess cover albums
        </SplashText>
      </section>
      <Footer>
        <div ref={startRef} className={styles.splash__swipeStart}>
          <Animate type={AnimationType.fadeIn}>
            <SplashText subtitle="Swipe up start" />
          </Animate>
          <Animate type={AnimationType.slideUp}>{SwipeUpIcon}</Animate>
        </div>
      </Footer>
    </>
  );
};

export default Splash;
