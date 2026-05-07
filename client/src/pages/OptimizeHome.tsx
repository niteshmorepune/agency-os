import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ChevronRight, Zap } from 'lucide-react';
import { api } from '../api/client';

interface ClientSummary {
  id: string;
  name: string;
  domain: string;
  industry?: string;
  status: string;
}

interface PlatformScore {
  platform: string;
  score: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  LINKEDIN: '#0a66c2', INSTAGRAM: '#e1306c', FACEBOOK: '#1877f2',
  GBP: '#34a853', YOUTUBE: '#ff0000', TWITTER: '#1da1f2',
  TIKTOK: '#010101', PINTEREST: '#e60023', GOOGLE_ADS: '#fbbc05',
  EMAIL: '#7c3aed', WHATSAPP: '#25d366',
};

function scoreColorClass(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
}

function scoreBarColor(score: number) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-400';
  return 'bg-red-400';
}

function MiniSparkline({ scores }: { scores: PlatformScore[] }) {
  if (scores.length === 0) return null;
  const sorted = [...scores].sort((a, b) => b.score - a.score).slice(0, 5);
  return (
    <div className="flex gap-1 items-end h-6 mt-2">
      {sorted.map(s => (
        <div
          key={s.platform}
          title={`${s.platform}: ${s.score}`}
          className="w-3 rounded-sm flex-shrink-0"
          style={{
            height: `${Math.max(4, (s.score / 100) * 24)}px`,
            backgroundColor: PLATFORM_COLORS[s.platform] ?? '#94a3b8',
          }}
        />
      ))}
    </div>
  );
}

function ClientOptimizerCard({ client }: { client: ClientSummary }) {
  const { data, isLoading } = useQuery({
    queryKey: ['optimization', client.id],
    queryFn: () => api.get<{ data: PlatformScore[] }>(`/optimization/${client.id}`),
    staleTime: 60_000,
  });

  const scores = data?.data ?? [];
  const avgScore = scores.length
    ? Math.round(scores.reduce((s, p) => s + p.score, 0) / scores.length)
    : null;
  const activePlatforms = scores.filter(s => s.score > 0).length;

  return (
    <Link
      to={`/optimize/${client.id}`}
      className="card p-5 hover:shadow-md transition-all group flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 font-bold text-lg">{client.name[0]}</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors truncate">{client.name}</h3>
            <p className="text-xs text-gray-400 truncate">{client.domain}</p>
          </div>
        </div>
        {isLoading ? (
          <div className="w-10 h-8 bg-gray-100 rounded animate-pulse" />
        ) : avgScore !== null ? (
          <div className="text-right flex-shrink-0">
            <div className={`text-2xl font-bold ${scoreColorClass(avgScore)}`}>{avgScore}</div>
            <div className="text-xs text-gray-400">avg</div>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Not started</span>
        )}
      </div>

      {isLoading ? (
        <div className="h-2 w-full bg-gray-100 rounded-full animate-pulse" />
      ) : avgScore !== null ? (
        <>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${scoreBarColor(avgScore)}`} style={{ width: `${avgScore}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <MiniSparkline scores={scores} />
            <span className="text-xs text-gray-400 flex-shrink-0">{activePlatforms} platform{activePlatforms !== 1 ? 's' : ''}</span>
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-400">Click to start optimising platforms</p>
      )}

      <div className="flex items-center gap-1 text-xs text-primary-600 font-medium mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
        Open Optimizer <ChevronRight size={13} />
      </div>
    </Link>
  );
}

export default function OptimizeHome() {
  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ data: ClientSummary[] }>('/clients'),
  });

  const clients = (data?.data ?? []).filter(c => c.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap size={24} className="text-primary-700" /> Platform Optimizer
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Select a client to review and improve their platform scores</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <TrendingUp size={16} />
          {clients.length} active client{clients.length !== 1 ? 's' : ''}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-44 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="card p-16 text-center">
          <Zap size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No active clients</h3>
          <p className="text-gray-500 mt-1">Add clients first, then optimise their platforms here.</p>
          <Link to="/clients/new" className="btn-primary mt-4 inline-flex items-center gap-2">Add Client</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => (
            <ClientOptimizerCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
