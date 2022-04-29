import { Component, For, Show } from 'solid-js';
import { useAuth } from './services/useAuth';

import styles from './App.module.css';
import useUser from './services/useUser';
import useTracks from './services/useTracks';
import usePageCount from './services/usePageCount';

const App: Component = () => {
  const { authorize, login, logout, isAuthenticated } = useAuth()!;

  authorize();

  const [user] = useUser();
  const [tracks] = useTracks();
  const [pageCount] = usePageCount();

  return (
    <div class={styles.App}>
      <h2>Music cover guesser</h2>

      <Show when={!isAuthenticated()}>
        <button onClick={login}>Login to Spotify</button>
      </Show>

      <Show when={isAuthenticated()}>
        <button onClick={logout}>Logout</button>
      </Show>

      <Show when={isAuthenticated()}>
        <>
          <h4>Username: {user()?.display_name}</h4>
          <h5>Track count: {tracks()?.total}</h5>
          <h5>Page count: {pageCount}</h5>
          <ul>
            <For each={tracks()?.items}>
              {(track, index) => (
                <li>
                  {index()} <img src={track.track.album.images[2].url} /> {track.track.name}
                </li>
              )}
            </For>
          </ul>
        </>
      </Show>
    </div>
  );
};

export default App;
