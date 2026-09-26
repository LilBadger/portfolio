import React from 'react';
import ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';
import '@fontsource-variable/jetbrains-mono/wght.css';
import '@fontsource-variable/archivo/wdth.css';
import 'lenis/dist/lenis.css';
import { App } from './App';
import './styles/tokens.css';
import './styles/global.css';
import './styles/glitch.css';
import './styles/bunny.css';
import './styles/layout.css';
import './styles/redesign.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

// Render synchronously so cross-document view transitions snapshot the real page, not an empty root.
flushSync(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
