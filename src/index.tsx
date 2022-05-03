/* @refresh reload */
import { render } from 'solid-js/web';

import './index.css';
import App from './App';
import { GameProvider } from './services/useGame';

render(
  () => (
    <GameProvider>
      <App />
    </GameProvider>
  ),
  document.getElementById('root') as HTMLElement
);
