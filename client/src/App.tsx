import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { api } from './api/client';
import { useAuthStore } from './store/auth.store';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import AIStudio from './pages/AIStudio';
import NotFound from './pages/NotFound';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-800 rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppInit() {
  const { setUser, setLoading } = useAuthStore();
  useEffect(() => {
    api.get<{ data: { id: string; email: string; name: string; role: never; agencyId: string } }>('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => { setUser(null); })
      .finally(() => setLoading(false));
  }, [setUser, setLoading]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/ai-studio" element={<ProtectedRoute><AIStudio /></ProtectedRoute>} />
        <Route path="/ai-studio/:toolId" element={<ProtectedRoute><AIStudio /></ProtectedRoute>} />
        <Route path="/optimize" element={<ProtectedRoute><div className="card p-8 text-center text-gray-400">Platform Optimizer — coming in Session 4</div></ProtectedRoute>} />
        <Route path="/content" element={<ProtectedRoute><div className="card p-8 text-center text-gray-400">Content Studio — coming in Session 7</div></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><div className="card p-8 text-center text-gray-400">Analytics — coming in Session 9</div></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><div className="card p-8 text-center text-gray-400">Admin Panel — coming in Session 10</div></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
