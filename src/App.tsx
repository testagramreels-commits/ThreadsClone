import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { EditProfilePage } from '@/pages/EditProfilePage';
import { ThreadDetailPage } from '@/pages/ThreadDetailPage';
import { SearchPage } from '@/pages/SearchPage';
import { ActivityPage } from '@/pages/ActivityPage';
import { VideoFeedPage } from '@/pages/VideoFeedPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { MessageConversationPage } from '@/pages/MessageConversationPage';
import { BookmarksPage } from '@/pages/BookmarksPage';
import { SettingsPage } from '@/pages/SettingsPage';

import { Toaster } from '@/components/ui/toaster';

import React, { Component, ReactNode, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

/* =========================
   FIREBASE (FCM WEB PUSH)
========================= */
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: '31488412729',
  appId: 'YOUR_APP_ID',
};

const firebaseApp = initializeApp(firebaseConfig);
const messaging = getMessaging(firebaseApp);

/* =========================
   ERROR BOUNDARY
========================= */
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-4 text-center">
            <h1 className="text-2xl font-bold text-destructive">
              Something went wrong
            </h1>
            <p className="text-muted-foreground">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/* =========================
   PROTECTED ROUTE
========================= */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

/* =========================
   BACK BUTTON HANDLER
========================= */
function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const listenerPromise = CapacitorApp.addListener('backButton', () => {
      const rootPaths = ['/', '/home'];

      if (rootPaths.includes(location.pathname)) {
        CapacitorApp.exitApp();
      } else {
        navigate(-1);
      }
    });

    return () => {
      listenerPromise.then((l) => l.remove());
    };
  }, [location.pathname, navigate]);

  return null;
}

/* =========================
   PUSH NOTIFICATIONS (FCM WEB)
========================= */
function PushNotificationHandler() {
  useEffect(() => {
    const init = async () => {
      try {
        // ======================
        // GET FCM TOKEN
        // ======================
        const token = await getToken(messaging, {
          vapidKey:
            'BPrgjAcXQ2iHJnoWgrxja1e7aMyGQh4G9XgQmahe7kfMJ6RFPtJ2einBoJo8HfDTKX9wFK9-6yY2VqVzKQyST9c',
        });

        console.log('🔥 FCM Token:', token);

        // 👉 Send token to your backend (Supabase recommended)
        // await saveTokenToDB(token);

        // ======================
        // FOREGROUND MESSAGES
        // ======================
        onMessage(messaging, (payload) => {
          console.log('📩 Notification received:', payload);

          alert(
            payload.notification?.title +
              '\n' +
              payload.notification?.body
          );
        });
      } catch (err) {
        console.error('FCM init error:', err);
      }
    };

    init();
  }, []);

  return null;
}

/* =========================
   APP ROUTES
========================= */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/profile/edit" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
      <Route path="/profile/:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/thread/:threadId" element={<ProtectedRoute><ThreadDetailPage /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
      <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
      <Route path="/videos" element={<ProtectedRoute><VideoFeedPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
      <Route path="/messages/:conversationId" element={<ProtectedRoute><MessageConversationPage /></ProtectedRoute>} />
      <Route path="/bookmarks" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/* =========================
   MAIN APP
========================= */
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <PushNotificationHandler />
        <BackButtonHandler />
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
