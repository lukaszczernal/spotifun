import { Component, useContext } from 'solid-js';
import { useAuth } from './services/useAuth';

import styles from './App.module.css';
import { Stage } from './Stage';
import { Splash } from './Splash';
import { Route, Routes } from 'solid-app-router';
import { AuthGuard } from './components/AuthGuard';
import { Logo } from './components/Logo';
import { Login } from './Login';
import { GameContext } from './services/useGame';

const App: Component = () => {
  const { authorize } = useAuth()!;
  const [{ stage }] = useContext(GameContext)!;

  authorize();

  return (
    <div class={`${styles.app} ${stage() > 0 ? styles.app__stage : ''}`}>
      <Logo compact={stage() > 0} />
      <Routes>
        <Route path="/game" element={<AuthGuard />}>
          <Route path="/*" element={<Stage />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<Splash />} />
      </Routes>
    </div>
  );
};

export default App;
