import { Button } from '../components/Button';
import { Footer } from '../components/Footer';
import { SplashText } from '../components/SplashText';
import { login } from '../services/authorize';

const Login = () => {
  return (
    <>
      <SplashText>Full version available after log in</SplashText>
      <Footer>
        <Button href="" onClick={login}>
          Login to Spotify
        </Button>
      </Footer>
    </>
  );
};

export default Login;
