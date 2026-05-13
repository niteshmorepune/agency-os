import { ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Users, BarChart3, Zap, PenSquare, Settings, LogOut, Menu, X, ChevronRight, Bot, BookOpen, Receipt, Activity } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import { useUIStore } from '../store/ui.store';
import { Role } from '@agencyos/shared';
import NotificationBell from './NotificationBell';

interface LayoutProps { children: ReactNode }
interface AgencyBranding { name: string; logoUrl: string | null; primaryColor: string }

const nav = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: 'all' },
  { label: 'Clients', icon: Users, href: '/clients', roles: 'all' },
  { label: 'AI Studio', icon: Bot, href: '/ai-studio', roles: [Role.OWNER, Role.ACCOUNT_MANAGER, Role.CONTENT_CREATOR, Role.SEO_ANALYST] },
  { label: 'Content', icon: PenSquare, href: '/content', roles: 'all' },
  { label: 'Analytics', icon: BarChart3, href: '/analytics', roles: 'all' },
  { label: 'Optimize', icon: Zap, href: '/optimize', roles: 'all' },
  { label: 'Invoices', icon: Receipt, href: '/invoices', roles: [Role.OWNER, Role.ACCOUNT_MANAGER] },
  { label: 'Activity', icon: Activity, href: '/activity', roles: [Role.OWNER, Role.ACCOUNT_MANAGER] },
  { label: 'Settings', icon: Settings, href: '/admin', roles: [Role.OWNER] },
  { label: 'Help & Guide', icon: BookOpen, href: '/help', roles: 'all' },
];

const CLIENT_NAV = [
  { label: 'My Dashboard', icon: LayoutDashboard, href: '/portal' },
  { label: 'Help & Guide', icon: BookOpen, href: '/help' },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<{ data: typeof user }>('/auth/me'),
    staleTime: 300_000,
  });

  const { data: brandingData } = useQuery({
    queryKey: ['agency-branding'],
    queryFn: () => api.get<{ data: AgencyBranding }>('/agency'),
    staleTime: 300_000,
    enabled: !!user,
  });
  const branding = brandingData?.data;

  useEffect(() => {
    if (meData?.data) setUser(meData.data as never);
  }, [meData, setUser]);

  const handleLogout = async () => {
    await api.post('/auth/logout', {});
    setUser(null);
    navigate('/login');
  };

  const isClient = user?.role === Role.CLIENT;

  const filteredNav = nav.filter(item => {
    if (item.roles === 'all') return true;
    return user && (item.roles as Role[]).includes(user.role);
  });

  const visibleNav = isClient ? CLIENT_NAV : filteredNav;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={toggleSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 lg:relative lg:inset-auto lg:z-auto flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-200 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: branding?.primaryColor ?? '#1a472a' }}>
            {branding?.logoUrl
              ? <img src={branding.logoUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-white font-bold text-sm">{(branding?.name ?? 'A')[0].toUpperCase()}</span>
            }
          </div>
          <span className="font-semibold text-gray-900 truncate">{branding?.name ?? (isClient ? 'My Portal' : 'Agency OS')}</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map(item => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary-50 text-primary-800' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <Icon size={18} className={active ? 'text-primary-700' : ''} />
                {item.label}
                {active && <ChevronRight size={14} className="ml-auto text-primary-400" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <NavLink to="/profile" className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg hover:bg-gray-50 transition-colors group">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-800 font-semibold text-sm">{user?.name?.[0]?.toUpperCase() ?? '?'}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-800">{user?.name ?? 'My Profile'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
          </NavLink>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors w-full">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex items-center gap-1 text-sm text-gray-500 flex-1 min-w-0">
            {location.pathname.split('/').filter(Boolean).map((segment, i, arr) => (
              <span key={i} className="flex items-center gap-1 min-w-0">
                {i > 0 && <ChevronRight size={14} className="flex-shrink-0" />}
                <span className={`truncate ${i === arr.length - 1 ? 'text-gray-900 font-medium' : 'capitalize hidden sm:inline'}`}>{segment}</span>
              </span>
            ))}
          </div>
          {!isClient && <NotificationBell />}
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
