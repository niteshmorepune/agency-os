import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { api } from './api/client';
import { useAuthStore } from './store/auth.store';
import Layout from './components/Layout';
import { Role } from '@agencyos/shared';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientPortal from './pages/ClientPortal';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import ClientNew from './pages/ClientNew';
import AIStudio from './pages/AIStudio';
import AIUsage from './pages/AIUsage';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import AuditList from './pages/AuditList';
import AuditDetail from './pages/AuditDetail';
import OptimizeHome from './pages/OptimizeHome';
import OptimizeClient from './pages/OptimizeClient';
import OptimizePlatform from './pages/OptimizePlatform';
import ContentHome from './pages/ContentHome';
import ContentComposer from './pages/ContentComposer';
import ContentCalendar from './pages/ContentCalendar';
import ContentIdeas from './pages/ContentIdeas';
import MediaLibrary from './pages/MediaLibrary';
import Help from './pages/Help';
import Invoices from './pages/Invoices';
import InvoiceView from './pages/InvoiceView';
import ActivityFeed from './pages/ActivityFeed';
import NotFound from './pages/NotFound';

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-800 rounded-full" />
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

// Redirects CLIENT role away from agency pages
function AgencyOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === Role.CLIENT) return <Navigate to="/portal" replace />;
  return <Layout>{children}</Layout>;
}

function RootRedirect() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === Role.CLIENT) return <Navigate to="/portal" replace />;
  return <Navigate to="/dashboard" replace />;
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
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="/portal" element={<ProtectedRoute><ClientPortal /></ProtectedRoute>} />
        <Route path="/dashboard" element={<AgencyOnlyRoute><Dashboard /></AgencyOnlyRoute>} />
        <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/clients/new" element={<ProtectedRoute><ClientNew /></ProtectedRoute>} />
        <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
        <Route path="/ai-studio" element={<ProtectedRoute><AIStudio /></ProtectedRoute>} />
        <Route path="/ai-studio/usage" element={<ProtectedRoute><AIUsage /></ProtectedRoute>} />
        <Route path="/ai-studio/:toolId" element={<ProtectedRoute><AIStudio /></ProtectedRoute>} />
        <Route path="/audit/:clientId" element={<ProtectedRoute><AuditList /></ProtectedRoute>} />
        <Route path="/audit/:clientId/:auditId" element={<ProtectedRoute><AuditDetail /></ProtectedRoute>} />
        <Route path="/optimize" element={<ProtectedRoute><OptimizeHome /></ProtectedRoute>} />
        <Route path="/optimize/:clientId" element={<ProtectedRoute><OptimizeClient /></ProtectedRoute>} />
        <Route path="/optimize/:clientId/:platform" element={<ProtectedRoute><OptimizePlatform /></ProtectedRoute>} />
        <Route path="/content" element={<ProtectedRoute><ContentHome /></ProtectedRoute>} />
        <Route path="/content/calendar" element={<ProtectedRoute><ContentCalendar /></ProtectedRoute>} />
        <Route path="/content/ideas" element={<ProtectedRoute><ContentIdeas /></ProtectedRoute>} />
        <Route path="/content/media" element={<ProtectedRoute><MediaLibrary /></ProtectedRoute>} />
        <Route path="/content/new" element={<ProtectedRoute><ContentComposer /></ProtectedRoute>} />
        <Route path="/content/:postId/edit" element={<ProtectedRoute><ContentComposer /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
        <Route path="/invoices" element={<AgencyOnlyRoute><Invoices /></AgencyOnlyRoute>} />
        <Route path="/invoices/:id" element={<AgencyOnlyRoute><InvoiceView /></AgencyOnlyRoute>} />
        <Route path="/activity" element={<AgencyOnlyRoute><ActivityFeed /></AgencyOnlyRoute>} />
        <Route path="/admin" element={<Navigate to="/settings" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
