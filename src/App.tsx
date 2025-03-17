import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { Cart } from './pages/Cart';
import { MyStore } from './pages/MyStore';
import { StoreDetails } from './pages/StoreDetails';
import { ProductDetails } from './pages/ProductDetails';
import { Chat } from './pages/Chat';
import { useAuthStore } from './store/authStore';
import { supabase } from './lib/supabase';
import { InstallPWA } from './components/InstallPWA';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.email === 'paulelite606@gmail.com';
  return isAdmin ? <>{children}</> : <Navigate to="/" />;
}

function App() {
  const setUser = useAuthStore((state) => state.setUser);
  const setSession = useAuthStore((state) => state.setSession);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Initial session check - handle silently to avoid console errors
    refreshSession().catch(() => {
      // If refresh fails, we've already cleared the session in the store
      console.log('Session refresh failed, user needs to log in again');
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        setSession(session);
        setUser(session?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED') {
        setSession(session);
        setUser(session?.user ?? null);
      } else if (event === 'USER_UPDATED') {
        setSession(session);
        setUser(session?.user ?? null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setSession, refreshSession]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar isLoggedIn={!!user} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
          <Route
            path="/cart"
            element={
              <PrivateRoute>
                <Cart />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-store"
            element={
              <PrivateRoute>
                <MyStore />
              </PrivateRoute>
            }
          />
          <Route
            path="/store/:storeId"
            element={<StoreDetails />}
          />
          <Route
            path="/product/:productId"
            element={<ProductDetails />}
          />
          <Route
            path="/chat-support"
            element={<Chat />}
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
        </Routes>
        <InstallPWA />
      </div>
    </Router>
  );
}

export default App