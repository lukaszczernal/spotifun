import { Component } from 'solid-js';
import { useAuth } from './services/useAuth';

import styles from './App.module.css';
import { Stage } from './Stage';
import { Splash } from './Splash';
import { ScoreBoard } from './ScoreBoard';
import { Route, Routes } from 'solid-app-router';
import { AuthGuard } from './components/AuthGuard';

const App: Component = () => {
  const { authorize, login } = useAuth()!;

  authorize();

  return (
    <div class={styles.app}>
      <Routes>
        <Route path="/game" element={<AuthGuard />}>
          <Route path="/score" element={<ScoreBoard />} />
          <Route path="/*" element={<Stage />} />
        </Route>

        <Route
          path="/login"
          element={
            <p>
              You need to login.{' '}
              <button onClick={login}>Login to Spotify</button>
            </p>
          }
        />
        <Route path="/*" element={<Splash />} />
      </Routes>
    </div>
  );
};

export default App;
