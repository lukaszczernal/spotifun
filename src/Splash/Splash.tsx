import { Button } from '../components/Button';
import { SplashText } from '../components/SplashText';

const Splash = () => {
  return (
    <>
      <SplashText>Quiz app powered by Spotify</SplashText>
      <Button href="/game">Start</Button>
    </>
  );
};

export default Splash;
