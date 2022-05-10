import { Button } from '../components/Button';
import { Footer } from '../components/Footer';
import { SplashText } from '../components/SplashText';

const Splash = () => {
  return (
    <>
      <SplashText>Guess cover albums of your favorite songs</SplashText>
      <Footer>
        <Button href="/game">Start</Button>
      </Footer>
    </>
  );
};

export default Splash;
