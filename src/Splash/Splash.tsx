import { Show } from 'solid-js';
import { Button } from '../components/Button';
import { Footer } from '../components/Footer';
import { SplashText } from '../components/SplashText';
import { useAuth } from '../services/useAuth';
import { usePlayer } from '../services/usePlayer';

const Splash = () => {
  const { isAuthenticated, login } = useAuth()!;
  const { play } = usePlayer()!;

  return (
    <>
      <SplashText subtitle="of your favourite songs">
        Guess cover albums
      </SplashText>
      <Footer>
        <Show
          when={isAuthenticated()}
          fallback={
            <Button href="" onClick={login}>
              Login to Spotify
            </Button>
          }
        >
          <Button href="/game" onClick={play}>
            Start
          </Button>
        </Show>
      </Footer>
    </>
  );
};

export default Splash;
