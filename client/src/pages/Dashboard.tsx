import { useQuery } from '@tanstack/react-query';
import { Users, Zap, BarChart3, Bot, TrendingUp, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import { Link } from 'react-router-dom';
import { Role } from '@agencyos/shared';

interface AnalyticsSummary {
  clients: { total: number; active: number };
  posts: { total: number; thisMonth: number; byStatus: Record<string, number> };
  audits: { total: number; inProgress: number; completed: number; avgScore: number | null };
  optimization: { overallAvg: number; platformScores: unknown[]; topClients: unknown[] };
  aiUsage: { totalCost: number; totalCalls: number; cachedCalls: number };
  recentPosts: {
    id: string;
    caption: string;
    platforms: string[];
    status: string;
    createdAt: string;
    aiGenerated: boolean;
    createdBy: { name: string };
    client: { name: string };
  }[];
}

const PLATFORM_BG: Record<string, string> = {
  LINKEDIN: 'bg-blue-600', INSTAGRAM: 'bg-pink-500', FACEBOOK: 'bg-blue-500',
  GBP: 'bg-green-600', YOUTUBE: 'bg-red-600', TWITTER: 'bg-sky-500',
  TIKTOK: 'bg-gray-800', PINTEREST: 'bg-red-500', GOOGLE_ADS: 'bg-yellow-500',
  EMAIL: 'bg-purple-600', WHATSAPP: 'bg-green-500',
};

const PLATFORM_LABELS: Record<string, string> = {
  LINKEDIN: 'LI', INSTAGRAM: 'IG', FACEBOOK: 'FB',
  GBP: 'GBP', YOUTUBE: 'YT', TWITTER: 'TW',
  TIKTOK: 'TT', PINTEREST: 'PIN', GOOGLE_ADS: 'GAds',
  EMAIL: 'Email', WHATSAPP: 'WA',
};

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => api.get<{ data: AnalyticsSummary }>('/analytics/summary'),
    staleTime: 60_000,
  });

  const d = data?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-gray-500 mt-1 text-sm">Here's your agency overview.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Clients" value={d?.clients.active ?? 0} sub={`${d?.clients.total ?? 0} total`} icon={Users} color="bg-blue-50 text-blue-600" />
          <StatCard label="Posts This Month" value={d?.posts.thisMonth ?? 0} sub={`${d?.posts.total ?? 0} total`} icon={FileText} color="bg-violet-50 text-violet-600" />
          <StatCard label="Avg Platform Score" value={d?.optimization.overallAvg || '—'} sub={`${d?.optimization.platformScores.length ?? 0} platforms tracked`} icon={Zap} color="bg-primary-50 text-primary-700" />
          <StatCard label="Audits" value={d?.audits.total ?? 0} sub={`${d?.audits.inProgress ?? 0} in progress`} icon={CheckCircle} color="bg-green-50 text-green-600" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent posts */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Recent Posts</h2>
            <Link to="/content" className="text-xs text-primary-600 hover:underline">View all →</Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : (d?.recentPosts.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText size={36} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No posts yet. <Link to="/content/new" className="text-primary-600 hover:underline">Create one.</Link></p>
            </div>
          ) : (
            <div className="space-y-2">
              {d!.recentPosts.slice(0, 4).map(post => (
                <Link key={post.id} to={`/content/${post.id}/edit`} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                      {post.platforms.slice(0, 3).map(p => (
                        <span key={p} className={`text-xs text-white px-1.5 py-0.5 rounded font-medium ${PLATFORM_BG[p] ?? 'bg-gray-500'}`}>
                          {PLATFORM_LABELS[p] ?? p}
                        </span>
                      ))}
                      {post.aiGenerated && <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">AI</span>}
                    </div>
                    <p className="text-sm text-gray-700 truncate group-hover:text-primary-700">{post.caption}</p>
                    <p className="text-xs text-gray-400">{post.client.name} · {new Date(post.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Add Client', href: '/clients/new', icon: Users, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
              { label: 'AI Studio', href: '/ai-studio', icon: Bot, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
              { label: 'Optimize', href: '/optimize', icon: Zap, color: 'bg-primary-50 text-primary-700 hover:bg-primary-100' },
              { label: 'Analytics', href: '/analytics', icon: BarChart3, color: 'bg-accent-50 text-accent-700 hover:bg-accent-100' },
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

          {user?.role === Role.OWNER && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Setup Reminder</p>
                  <p className="text-xs text-amber-700 mt-0.5">Configure API keys in Settings to unlock all AI features.</p>
                  <Link to="/settings" state={{ tab: 'api-keys' }} className="text-xs text-amber-700 underline mt-1 inline-block">Go to Settings →</Link>
                </div>
              </div>
            </div>
          )}

          {(d?.optimization.overallAvg ?? 0) > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-primary-700" />
                <span className="text-sm font-medium text-primary-800">Overall platform score</span>
              </div>
              <span className={`text-lg font-bold ${
                (d?.optimization.overallAvg ?? 0) >= 80 ? 'text-green-600' :
                (d?.optimization.overallAvg ?? 0) >= 60 ? 'text-yellow-500' : 'text-red-500'
              }`}>{d?.optimization.overallAvg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
