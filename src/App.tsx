import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './components/AuthLayout';
import { Loading } from './components/ui';
import { AuthCallback, AuthPage, ForgotPassword, ResetPassword } from './pages/AuthPages';

const AppLayout = lazy(() => import('./components/AppLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const UpcomingPage = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.UpcomingPage })));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Legal = lazy(() => import('./pages/Legal'));

function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const label = pathname.split('/').filter(Boolean).pop()?.replaceAll('-', ' ') || 'Create account';
    document.title = `${label.charAt(0).toUpperCase() + label.slice(1)} | SmartHire AI`;
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <RouteEffects />
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route element={<AuthLayout />}>
                <Route path="/register" element={<AuthPage mode="register" />} />
                <Route path="/login" element={<AuthPage mode="login" />} />
              </Route>
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/terms" element={<Legal />} />
              <Route path="/privacy" element={<Legal privacy />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  {(['interview', 'interviews', 'resume', 'analytics', 'reports'] as const).map(page => (
                    <Route key={page} path={`/${page}`} element={<UpcomingPage page={page} />} />
                  ))}
                </Route>
              </Route>
              <Route path="*" element={
                <main className="not-found">
                  <h1>This page took a different path.</h1>
                  <p>Let’s get you back to your next chapter.</p>
                  <a className="button" href="/dashboard">Back to your workspace</a>
                </main>
              } />
            </Routes>
          </Suspense>
        </AuthProvider>
      </MotionConfig>
    </BrowserRouter>
  );
}
