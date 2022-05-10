import { Button } from '../components/Button';
import { SplashText } from '../components/SplashText';

const Splash = () => {
  return (
    <>
      <SplashText>Guess cover albums of your favorite songs</SplashText>
      <Button href="/game">Start</Button>
    </>
  );
};

export default Splash;
