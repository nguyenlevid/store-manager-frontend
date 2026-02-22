import { Router, Route } from '@solidjs/router';
import { lazy, type Component, type ParentProps } from 'solid-js';
import { MainLayout } from './layouts/MainLayout';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { ToastContainer } from '@/shared/ui';

// Lazy load pages
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const SignupPage = lazy(() => import('@/features/auth/pages/SignupPage'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const ImportsPage = lazy(() => import('./pages/ImportsPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'));
const TransfersPage = lazy(() => import('./pages/TransfersPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const TeamManagementPage = lazy(() => import('./pages/TeamManagementPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const OnboardingPage = lazy(
  () => import('@/features/auth/pages/OnboardingPage')
);
const ForgotPasswordPage = lazy(
  () => import('@/features/auth/pages/ForgotPasswordPage')
);
const ResetPasswordPage = lazy(
  () => import('@/features/auth/pages/ResetPasswordPage')
);

// Protected layout wrapper
const ProtectedLayout: Component<ParentProps> = (props) => {
  return (
    <ProtectedRoute>
      <MainLayout>{props.children}</MainLayout>
    </ProtectedRoute>
  );
};

export function AppRouter() {
  return (
    <>
      <Router>
        {/* Public routes */}
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />

        {/* Protected routes with layout */}
        <Route path="/" component={ProtectedLayout}>
          <Route path="/" component={HomePage} />
          <Route path="/inventory" component={InventoryPage} />
          <Route path="/orders" component={OrdersPage} />
          <Route path="/imports" component={ImportsPage} />
          <Route path="/transfers" component={TransfersPage} />
          <Route path="/clients" component={ClientsPage} />
          <Route path="/suppliers" component={SuppliersPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/team" component={TeamManagementPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="*" component={NotFoundPage} />
        </Route>
      </Router>

      {/* Global notification container */}
      <ToastContainer />
    </>
  );
}
