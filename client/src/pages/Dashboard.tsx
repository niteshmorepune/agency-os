import { useQuery } from '@tanstack/react-query';
import { Users, Zap, BarChart3, Bot, TrendingUp, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import { Link } from 'react-router-dom';

interface ClientSummary {
  id: string;
  name: string;
  domain: string;
  industry?: string;
  status: string;
  monthlyRetainer?: number;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ data: ClientSummary[] }>('/clients'),
  });

  const clients = data?.data ?? [];

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-gray-100 rounded-xl" /><div className="h-32 bg-gray-100 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-gray-500 mt-1">Here's your agency overview for today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Clients" value={clients.filter(c => c.status === 'ACTIVE').length} icon={Users} color="bg-blue-50 text-blue-600" />
        <StatCard label="Total Clients" value={clients.length} icon={TrendingUp} color="bg-primary-50 text-primary-700" />
        <StatCard label="Platforms Tracked" value="10" icon={Zap} color="bg-purple-50 text-purple-600" />
        <StatCard label="AI Tools Available" value="12" icon={Bot} color="bg-accent-50 text-accent-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Clients</h2>
          {clients.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-50" />
              <p>No clients yet. <Link to="/clients/new" className="text-primary-600 hover:underline">Add your first client.</Link></p>
            </div>
          ) : (
            <div className="space-y-3">
              {clients.slice(0, 5).map(client => (
                <Link key={client.id} to={`/clients/${client.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-700 font-semibold text-sm">{client.name[0]}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-primary-700">{client.name}</p>
                      <p className="text-xs text-gray-500">{client.domain}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${client.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {client.status}
                  </span>
                </Link>
              ))}
              {clients.length > 5 && (
                <Link to="/clients" className="block text-center text-sm text-primary-600 hover:underline pt-2">View all {clients.length} clients →</Link>
              )}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Add Client', href: '/clients/new', icon: Users, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
              { label: 'AI Studio', href: '/ai-studio', icon: Bot, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
              { label: 'Optimize Platform', href: '/optimize', icon: Zap, color: 'bg-primary-50 text-primary-700 hover:bg-primary-100' },
              { label: 'View Analytics', href: '/analytics', icon: BarChart3, color: 'bg-accent-50 text-accent-700 hover:bg-accent-100' },
            ].map(action => {
              const Icon = action.icon;
              return (
                <Link key={action.href} to={action.href} className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors text-center ${action.color}`}>
                  <Icon size={22} />
                  <span className="text-sm font-medium">{action.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Getting Started</p>
                <p className="text-xs text-amber-700 mt-0.5">Configure your API keys in Settings to unlock all AI features and integrations.</p>
                <Link to="/admin/integrations" className="text-xs text-amber-700 underline mt-1 inline-block">Configure now →</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
