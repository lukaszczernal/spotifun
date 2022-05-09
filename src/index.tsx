/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
import { GameProvider } from './services/useGame';
import { hashIntegration, Router } from 'solid-app-router';

import './index.css';

render(
  () => (
    <Router source={hashIntegration()}>
      <GameProvider>
        <App />
      </GameProvider>
    </Router> 
  ),
  document.getElementById('root') as HTMLElement
);
