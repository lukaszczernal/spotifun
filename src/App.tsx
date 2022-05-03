import { Component, Match, Show, Switch, useContext } from 'solid-js';
import { useAuth } from './services/useAuth';

import styles from './App.module.css';
import useUser from './services/useUser';
import { GameContext } from './services/useGame';
import { Stage } from './Stage';

const App: Component = () => {
  const { authorize, login, logout, isAuthenticated } = useAuth()!;

  authorize();

  const [user] = useUser();
  const [gameStore] = useContext(GameContext)!;

  return (
    <div class={styles.App}>
      <h2>Music cover guesser</h2>

      <Switch fallback={<button onClick={login}>Login to Spotify</button>}>
        <Match when={isAuthenticated()}>
          <button onClick={logout}>Logout</button>
        </Match>
      </Switch>

      <Show when={isAuthenticated()}>
        <>
          <h4>Username: {user()?.display_name}</h4>
          <h5>Current stage: {gameStore.currentStage()}</h5>
          <Stage />
        </>
      </Show>
    </div>
  );
};

export default App;
