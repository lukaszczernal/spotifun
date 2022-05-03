import { Component, Match, Show, Switch, useContext } from 'solid-js';
import { useAuth } from './services/useAuth';

import styles from './App.module.css';
import useUser from './services/useUser';
import { GameContext } from './services/useGame';
import { Stage } from './Stage';
import { Splash } from './Splash';

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
        <h4>Username: {user()?.display_name}</h4>
        <Switch>
          <Match when={gameStore.stage() === 0}>
            <Splash />
          </Match>

          <Match when={gameStore.stage() > 3}>
            <h1>you won</h1>
          </Match>

          <Match when={gameStore.stage() > 0}>
            <Stage />
          </Match>
        </Switch>
    
      </Show>
    </div>
  );
};

export default App;
