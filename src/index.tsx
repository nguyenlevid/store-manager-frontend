import { render } from 'solid-js/web';
import { AppRouter } from './app/router';
import { initSession } from './features/auth/store/session.store';
import { initTheme } from './theme';
import { cleanupDeprecatedStorage } from './shared/lib/cleanup';
import './index.css';

// Clean up deprecated localStorage items from previous versions
cleanupDeprecatedStorage();

// Initialize theme system first
initTheme();

// Initialize session before rendering
initSession().then(() => {
  const root = document.getElementById('root');

  if (!root) {
    throw new Error('Root element not found');
  }

  render(() => <AppRouter />, root);
});
