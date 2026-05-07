import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../api/client';

interface PlatformSummary {
  platform: string;
  score: number;
  updatedAt: string;
  _count: { checks: number };
}

interface ScoreHistoryEntry {
  id: string;
  score: number;
  recordedAt: string;
  optimization: { platform: string };
}

interface ClientBasic {
  id: string;
  name: string;
  domain: string;
}

const PLATFORM_META: Record<string, { label: string; color: string; bg: string }> = {
  LINKEDIN:    { label: 'LinkedIn',    color: '#0a66c2', bg: 'bg-blue-600' },
  INSTAGRAM:   { label: 'Instagram',  color: '#e1306c', bg: 'bg-pink-500' },
  FACEBOOK:    { label: 'Facebook',   color: '#1877f2', bg: 'bg-blue-500' },
  GBP:         { label: 'Google Biz', color: '#34a853', bg: 'bg-green-600' },
  YOUTUBE:     { label: 'YouTube',    color: '#ff0000', bg: 'bg-red-600' },
  TWITTER:     { label: 'X / Twitter', color: '#1da1f2', bg: 'bg-sky-500' },
  TIKTOK:      { label: 'TikTok',     color: '#010101', bg: 'bg-gray-900' },
  PINTEREST:   { label: 'Pinterest',  color: '#e60023', bg: 'bg-red-500' },
  GOOGLE_ADS:  { label: 'Google Ads', color: '#fbbc05', bg: 'bg-yellow-500' },
  EMAIL:       { label: 'Email',      color: '#7c3aed', bg: 'bg-purple-600' },
  WHATSAPP:    { label: 'WhatsApp',   color: '#25d366', bg: 'bg-green-500' },
};

const CHART_COLORS = ['#1a472a','#e1306c','#0a66c2','#34a853','#ff0000','#fbbc05','#7c3aed','#e60023','#1da1f2','#25d366','#010101'];

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

function buildChartData(history: ScoreHistoryEntry[]) {
  const byDate: Record<string, Record<string, number>> = {};
  for (const h of history) {
    const date = new Date(h.recordedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    byDate[date] ??= {};
    byDate[date][h.optimization.platform] = h.score;
  }
  return Object.entries(byDate).map(([date, scores]) => ({ date, ...scores }));
}

export default function OptimizeClient() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const { data: clientData } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => api.get<{ data: ClientBasic }>(`/clients/${clientId}`),
    enabled: !!clientId,
  });

  const { data: platformsData, isLoading } = useQuery({
    queryKey: ['optimization', clientId],
    queryFn: () => api.get<{ data: PlatformSummary[] }>(`/optimization/${clientId}`),
    enabled: !!clientId,
  });

  const { data: historyData } = useQuery({
    queryKey: ['optimization-history', clientId],
    queryFn: () => api.get<{ data: ScoreHistoryEntry[] }>(`/optimization/${clientId}/score-history`),
    enabled: !!clientId,
  });

  const client = clientData?.data;
  const platforms = platformsData?.data ?? [];
  const history = historyData?.data ?? [];
  const chartData = buildChartData(history);
  const platformsInHistory = [...new Set(history.map(h => h.optimization.platform))];

  const avgScore = platforms.length
    ? Math.round(platforms.reduce((s, p) => s + p.score, 0) / platforms.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(`/clients/${clientId}`)} className="mt-1 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 flex-shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to={`/clients/${clientId}`} className="hover:text-primary-600">{client?.name ?? '…'}</Link>
            <span>/</span>
            <span>Platform Optimizer</span>
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Platform Optimizer</h1>
            {platforms.length > 0 && (
              <div className="flex items-center gap-2 bg-primary-50 rounded-xl px-4 py-1.5">
                <TrendingUp size={16} className="text-primary-700" />
                <span className="text-sm font-semibold text-primary-800">Avg Score: {avgScore}</span>
              </div>
            )}
          </div>
          <p className="text-gray-500 mt-0.5 text-sm">Click a platform to review and update checks</p>
        </div>
      </div>

      {/* Platform score cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.keys(PLATFORM_META).map(platform => {
            const existing = platforms.find(p => p.platform === platform);
            const meta = PLATFORM_META[platform];
            const score = existing?.score ?? null;
            return (
              <Link
                key={platform}
                to={`/optimize/${clientId}/${platform}`}
                className="card p-4 hover:shadow-md transition-all group flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold text-white px-2.5 py-1 rounded-lg ${meta.bg}`}>
                    {meta.label}
                  </span>
                  {score !== null && (
                    <span className={`text-xl font-bold ${scoreColorClass(score)}`}>{score}</span>
                  )}
                </div>
                {score !== null ? (
                  <>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${scoreBarColor(score)}`} style={{ width: `${score}%` }} />
                    </div>
                    <p className="text-xs text-gray-400">{existing?._count.checks ?? 0} checks · {new Date(existing!.updatedAt).toLocaleDateString('en-IN')}</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 mt-auto">Not started — click to begin</p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Score history chart */}
      {chartData.length > 1 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Score History</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(val: number, name: string) => [val, PLATFORM_META[name]?.label ?? name]}
              />
              <Legend formatter={(val: string) => PLATFORM_META[val]?.label ?? val} wrapperStyle={{ fontSize: 11 }} />
              {platformsInHistory.map((platform, i) => (
                <Line
                  key={platform}
                  type="monotone"
                  dataKey={platform}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length <= 1 && platforms.length > 0 && (
        <div className="card p-5 text-center text-gray-400 text-sm">
          Score history chart will appear after you update checks across multiple sessions.
        </div>
      )}
    </div>
  );
}
