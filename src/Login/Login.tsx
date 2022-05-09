import { Button } from '../components/Button';
import { SplashText } from '../components/SplashText';
import { login } from '../services/authorize';

const Login = () => {
  return (
    <>
      <SplashText>Full version available after log in</SplashText>
      <Button href="" onClick={login}>Login to Spotify</Button>
    </>
  );
};

export default Login;
