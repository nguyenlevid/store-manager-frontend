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

// Get root element
const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

// Render app immediately (don't wait for session init)
// ProtectedRoute will handle loading state
render(() => <AppRouter />, root);

// Initialize session in background
// ProtectedRoute components will react to authentication state changes
initSession();
