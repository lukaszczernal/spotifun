import { Component, Show } from 'solid-js';
import { useAuth } from './services/useAuth';

import styles from './App.module.css';
import useUser from './services/useUser';

const App: Component = () => {
  const {authorize, login, logout, isAuthenticated} = useAuth()!;

  authorize();

  const [user] = useUser();

  console.log('user', user(), user.loading, user.error);

  return (
    <div class={styles.App}>
      <h2>Music cover guesser</h2>
      <Show when={!isAuthenticated()}>
        <button onClick={login}>Login to Spotify</button>
      </Show>
      <Show when={isAuthenticated()}>
        <ul>
          <li>{user()?.display_name}</li>
        </ul>
        <button onClick={logout}>Logout</button>
      </Show>
    </div>
  );
};

export default App;
