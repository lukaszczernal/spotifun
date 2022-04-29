import { Component, For, Show } from 'solid-js';
import { useAuth } from './services/useAuth';

import styles from './App.module.css';
import useUser from './services/useUser';
import usePageCount from './services/usePageCount';
import useRandomTracks from './services/useRandomTracks';

const App: Component = () => {
  const { authorize, login, logout, isAuthenticated } = useAuth()!;

  authorize();

  const [user] = useUser();
  const [randomTracks, random, previewURL] = useRandomTracks();
  const [pageCount, total] = usePageCount();

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
          <h5>Track count: {total}</h5>
          <h5>Page count: {pageCount}</h5>
          <h5>Random: {random().join(',')}</h5>
          <h5>Preview URL: {previewURL()}</h5>
          <ul>
            <For each={randomTracks()}>
              {(track, index) => (
                <li>
                  {index()} <img src={track.track.album.images[2].url} />{' '}
                  {track.track.name}
                </li>
              )}
            </For>
          </ul>
          <Show when={previewURL()}>
            <audio controls>
              <source src={previewURL()} type="audio/mpeg" />
            </audio>
          </Show>
        </>
      </Show>
    </div>
  );
};

export default App;
