import { useContext } from 'solid-js';
import { GameContext } from '../services/useGame';

const Splash = () => {
  const [_, gameAction] = useContext(GameContext)!;

  return (
    <>
      <h1>Guess cover by sample</h1>
      <button onClick={() => gameAction.startGame()}>Start</button>
    </>
  );
};

export default Splash;
