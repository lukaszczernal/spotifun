/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
import { GameProvider } from './services/useGame';
import { PlayerProvider } from './services/usePlayer';
import { ProgressProvider } from './services/useProgress';
import { hashIntegration, Router } from 'solid-app-router';

import './index.css';

render(
  () => (
    <Router source={hashIntegration()}>
      <ProgressProvider>
        <GameProvider>
          <PlayerProvider>
            <App />
          </PlayerProvider>
        </GameProvider>
      </ProgressProvider>
    </Router>
  ),
  document.getElementById('root') as HTMLElement
);
