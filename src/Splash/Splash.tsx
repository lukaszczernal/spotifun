import { Link } from 'solid-app-router';

const Splash = () => {
  return (
    <>
      <h2>Spotifun</h2>

      <Link class="nav" href="/game">
        Start
      </Link>
    </>
  );
};

export default Splash;
