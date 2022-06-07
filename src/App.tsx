import { Component } from 'solid-js';
import { useAuth } from './services/useAuth';

import styles from './App.module.css';
import { Stage } from './Stage';
import { Splash } from './Splash';
import { Route, Routes, useLocation } from 'solid-app-router';
import { AuthGuard } from './components/AuthGuard';
import { Logo } from './components/Logo';
import { Player } from './components/Player';
import { Login } from './Login';
import { ScoreBoard } from './ScoreBoard';

const App: Component = () => {
  const { authorize } = useAuth()!;
  const location = useLocation();
  const inGame = () => location.pathname.startsWith('/game');

  authorize();

  return (
    <>
      <div className={`${styles.app} ${inGame() ? styles.app__stage : ''}`}>
        <Logo compact={inGame()} />
        <Routes>
          <Route path="/game" element={<AuthGuard />}>
            <Route path="/score" element={<ScoreBoard />} />
            <Route path="/*" element={<Stage />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<Splash />} />
        </Routes>
      </div>
      <Player />
    </>
  );
};

export default App;
