/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
import { GameProvider } from './services/useGame';
import { PlayerProvider } from './services/usePlayer';
import { hashIntegration, Router } from 'solid-app-router';

import './index.css';

render(
  () => (
    <Router source={hashIntegration()}>
      <GameProvider>
        <PlayerProvider>
          <App />
        </PlayerProvider>
      </GameProvider>
    </Router>
  ),
  document.getElementById('root') as HTMLElement
);
