import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Building2, Globe, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';

interface Client {
  id: string;
  name: string;
  domain: string;
  industry?: string;
  status: string;
  monthlyRetainer?: number;
  contactEmail?: string;
  avgScore: number | null;
  health: 'green' | 'yellow' | 'red';
}

const HEALTH_META = {
  green:  { dot: 'bg-green-500',  label: 'Healthy',        text: 'text-green-700',  bg: 'bg-green-50'  },
  yellow: { dot: 'bg-yellow-400', label: 'Needs attention', text: 'text-yellow-700', bg: 'bg-yellow-50' },
  red:    { dot: 'bg-red-500',    label: 'At risk',         text: 'text-red-700',    bg: 'bg-red-50'    },
};

export default function Clients() {
  const { user } = useAuthStore();
  const isOwnerOrAM = user?.role === 'OWNER' || user?.role === 'ACCOUNT_MANAGER';
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ data: Client[]; pagination: { total: number } }>('/clients'),
  });

  const clients = (data?.data ?? []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.domain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">{data?.pagination?.total ?? 0} total clients</p>
        </div>
        <Link to="/clients/new" className="btn-primary">
          <Plus size={18} />
          Add Client
        </Link>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="input pl-10 max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-44 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="card p-16 text-center">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          {search ? (
            <>
              <h3 className="text-lg font-semibold text-gray-700">No clients match "{search}"</h3>
              <p className="text-gray-500 mt-1">Try a different name or domain.</p>
            </>
          ) : data?.pagination?.total === 0 && !isOwnerOrAM ? (
            <>
              <h3 className="text-lg font-semibold text-gray-700">No clients assigned yet</h3>
              <p className="text-gray-500 mt-1">You haven't been assigned to any clients. Contact your account owner to get added.</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-700">No clients yet</h3>
              <p className="text-gray-500 mt-1">Get started by adding your first client.</p>
              <Link to="/clients/new" className="btn-primary mt-4 inline-flex">
                <Plus size={18} />
                Add Client
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => (
            <Link key={client.id} to={`/clients/${client.id}`} className="card p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 font-bold text-lg">{client.name[0]}</span>
                </div>
                <div className="flex items-center gap-2">
                  {client.health && (
                    <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${HEALTH_META[client.health].bg} ${HEALTH_META[client.health].text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${HEALTH_META[client.health].dot}`} />
                      {client.avgScore !== null ? `${client.avgScore}` : HEALTH_META[client.health].label}
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${client.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : client.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                    {client.status}
                  </span>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{client.name}</h3>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <Globe size={12} />
                {client.domain}
              </div>
              {client.industry && <p className="text-xs text-gray-400 mt-1">{client.industry}</p>}
              {client.monthlyRetainer && (
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                  <TrendingUp size={14} className="text-primary-600" />
                  <span className="text-sm font-medium text-gray-700">₹{client.monthlyRetainer.toLocaleString()}/mo</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
