import { Button } from '../components/Button';
import { Footer } from '../components/Footer';
import { SplashText } from '../components/SplashText';

const Splash = () => {
  return (
    <>
      <SplashText subtitle="of your favourite songs">Guess cover albums</SplashText>
      <Footer>
        <Button href="/game">Start</Button>
      </Footer>
    </>
  );
};

export default Splash;
