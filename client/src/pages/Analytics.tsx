import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users, Zap, DollarSign, FileText, TrendingUp,
  CheckCircle, Clock, BarChart2, Bot, ChevronRight, Download, RefreshCw, Sparkles, Mail,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadialBarChart, RadialBar, Legend,
} from 'recharts';
import { api } from '../api/client';

interface AnalyticsSummary {
  clients: { total: number; active: number };
  posts: { total: number; thisMonth: number; byStatus: Record<string, number> };
  audits: { total: number; inProgress: number; completed: number; avgScore: number | null };
  optimization: {
    overallAvg: number;
    platformScores: { platform: string; avgScore: number; count: number }[];
    topClients: { clientId: string; name: string; avgScore: number; platforms: number }[];
  };
  aiUsage: { totalCost: number; totalCalls: number; cachedCalls: number };
  recentPosts: {
    id: string;
    caption: string;
    platforms: string[];
    status: string;
    approvalStatus: string;
    scheduledAt: string | null;
    createdAt: string;
    aiGenerated: boolean;
    createdBy: { name: string };
    client: { name: string };
  }[];
}

const PLATFORM_LABELS: Record<string, string> = {
  LINKEDIN: 'LinkedIn', INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook',
  GBP: 'Google Biz', YOUTUBE: 'YouTube', TWITTER: 'X/Twitter',
  TIKTOK: 'TikTok', PINTEREST: 'Pinterest', GOOGLE_ADS: 'Google Ads',
  EMAIL: 'Email', WHATSAPP: 'WhatsApp',
};

const PLATFORM_BG: Record<string, string> = {
  LINKEDIN: 'bg-blue-600', INSTAGRAM: 'bg-pink-500', FACEBOOK: 'bg-blue-500',
  GBP: 'bg-green-600', YOUTUBE: 'bg-red-600', TWITTER: 'bg-sky-500',
  TIKTOK: 'bg-gray-800', PINTEREST: 'bg-red-500', GOOGLE_ADS: 'bg-yellow-500',
  EMAIL: 'bg-purple-600', WHATSAPP: 'bg-green-500',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8', SCHEDULED: '#3b82f6', PUBLISHED: '#22c55e',
  FAILED: '#ef4444', ARCHIVED: '#d1d5db',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', SCHEDULED: 'Scheduled', PUBLISHED: 'Published',
  FAILED: 'Failed', ARCHIVED: 'Archived',
};

function scoreColorClass(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
}

function scoreBarColor(score: number) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
}

function SummaryCard({
  label, value, sub, icon: Icon, iconBg, linkTo,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  linkTo?: string;
}) {
  const inner = (
    <div className="card p-5 flex items-start gap-4 hover:shadow-sm transition-shadow">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {linkTo && <ChevronRight size={16} className="text-gray-300 mt-1 flex-shrink-0" />}
    </div>
  );
  return linkTo ? <Link to={linkTo}>{inner}</Link> : inner;
}

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize={size < 60 ? 11 : 14} fontWeight="bold" fill={color}>
        {score}
      </text>
    </svg>
  );
}

interface Digest { id: string; content: string; weekLabel: string; createdAt: string }

export default function Analytics() {
  const now = new Date();
  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const [downloading, setDownloading] = useState(false);
  const qc = useQueryClient();

  const downloadMonthlyReport = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/reports/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agency-report-${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).replace(' ', '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => api.get<{ data: AnalyticsSummary }>('/analytics/summary'),
    staleTime: 60_000,
  });

  const { data: digestData, isLoading: digestLoading } = useQuery({
    queryKey: ['digest-latest'],
    queryFn: () => api.get<{ data: Digest | null }>('/digest/latest'),
    staleTime: 300_000,
  });
  const digest = digestData?.data;

  const generateMutation = useMutation({
    mutationFn: () => api.post<{ data: Digest }>('/digest/generate', {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['digest-latest'] }); toast.success('Digest generated'); },
    onError: () => toast.error('Failed to generate digest'),
  });

  const emailDigestMutation = useMutation({
    mutationFn: () => api.post('/digest/email', {}),
    onSuccess: () => toast.success('Digest emailed to you'),
    onError: (e: Error) => toast.error(e.message || 'Failed to send email'),
  });

  const d = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-gray-100 rounded-xl" />
          <div className="h-72 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!d) return null;

  // Platform scores chart data
  const platformChartData = d.optimization.platformScores.map(p => ({
    name: PLATFORM_LABELS[p.platform] ?? p.platform,
    platform: p.platform,
    score: p.avgScore,
    count: p.count,
  }));

  // Post status radial/bar data
  const postStatusData = Object.entries(d.posts.byStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ name: STATUS_LABELS[status] ?? status, value: count, fill: STATUS_COLORS[status] ?? '#94a3b8' }));

  const cacheRate = d.aiUsage.totalCalls > 0
    ? Math.round((d.aiUsage.cachedCalls / d.aiUsage.totalCalls) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1 text-sm">Agency-wide performance overview · {monthName}</p>
        </div>
        <button
          onClick={downloadMonthlyReport}
          disabled={downloading}
          className="btn-primary text-sm flex items-center gap-2 flex-shrink-0"
        >
          {downloading ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
          {downloading ? 'Generating PDF…' : 'Monthly Report PDF'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Active Clients"
          value={d.clients.active}
          sub={`${d.clients.total} total`}
          icon={Users}
          iconBg="bg-blue-50 text-blue-600"
          linkTo="/clients"
        />
        <SummaryCard
          label="Posts This Month"
          value={d.posts.thisMonth}
          sub={`${d.posts.total} total`}
          icon={FileText}
          iconBg="bg-violet-50 text-violet-600"
          linkTo="/content"
        />
        <SummaryCard
          label="Avg Platform Score"
          value={d.optimization.overallAvg || '—'}
          sub={`across ${d.optimization.platformScores.length} platforms`}
          icon={Zap}
          iconBg="bg-primary-50 text-primary-700"
          linkTo="/optimize"
        />
        <SummaryCard
          label={`AI Cost (${now.toLocaleDateString('en-IN', { month: 'short' })})`}
          value={`$${d.aiUsage.totalCost.toFixed(4)}`}
          sub={`${d.aiUsage.totalCalls} calls · ${cacheRate}% cached`}
          icon={DollarSign}
          iconBg="bg-amber-50 text-amber-600"
          linkTo="/ai-studio/usage"
        />
      </div>

      {/* Platform scores + Post activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform scores bar chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <BarChart2 size={16} className="text-primary-700" />
              Avg Score by Platform
            </h2>
            <Link to="/optimize" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              Open Optimizer →
            </Link>
          </div>
          {platformChartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-300">
              <Zap size={32} className="mb-2" />
              <p className="text-sm">No optimization data yet.</p>
              <Link to="/optimize" className="btn-primary text-xs mt-3">Start Optimizing</Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={platformChartData} layout="vertical" margin={{ top: 0, right: 8, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} width={60} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(val: number, _: string, entry) => [
                    `${val} / 100 (${(entry.payload as { count: number }).count} client${(entry.payload as { count: number }).count !== 1 ? 's' : ''})`,
                    'Avg Score',
                  ]}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {platformChartData.map(entry => (
                    <Cell key={entry.platform} fill={scoreBarColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Post activity */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText size={16} className="text-primary-700" />
              Post Activity
            </h2>
            <Link to="/content" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              Open Studio →
            </Link>
          </div>
          {postStatusData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-300">
              <FileText size={32} className="mb-2" />
              <p className="text-sm">No posts created yet.</p>
              <Link to="/content/new" className="btn-primary text-xs mt-3">Create First Post</Link>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <RadialBarChart
                  cx="50%" cy="50%"
                  innerRadius="30%"
                  outerRadius="90%"
                  data={postStatusData}
                  startAngle={180}
                  endAngle={-180}
                >
                  <RadialBar dataKey="value" label={false} background={{ fill: '#f8fafc' }} />
                  <Legend
                    iconSize={10}
                    formatter={(val) => <span style={{ fontSize: 11, color: '#6b7280' }}>{val}</span>}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={(val: number, name: string) => [val, name]}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {postStatusData.map(s => (
                  <div key={s.name} className="text-center">
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.name}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top clients + Audit overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top clients by optimization score */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp size={16} className="text-primary-700" />
              Top Clients by Score
            </h2>
            <Link to="/optimize" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all →</Link>
          </div>
          {d.optimization.topClients.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No optimization data yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {d.optimization.topClients.map((client, i) => (
                <Link
                  key={client.clientId}
                  to={`/optimize/${client.clientId}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 group-hover:text-primary-700 text-sm truncate">{client.name}</p>
                    <p className="text-xs text-gray-400">{client.platforms} platform{client.platforms !== 1 ? 's' : ''} optimized</p>
                  </div>
                  <ScoreRing score={client.avgScore} size={44} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Audit overview */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <CheckCircle size={16} className="text-primary-700" />
              Audit Overview
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-blue-700">{d.audits.total}</p>
                <p className="text-xs text-blue-600 mt-0.5">Total</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-amber-600">{d.audits.inProgress}</p>
                <p className="text-xs text-amber-500 mt-0.5 flex items-center justify-center gap-1">
                  <Clock size={10} /> In Progress
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-green-700">{d.audits.completed}</p>
                <p className="text-xs text-green-600 mt-0.5 flex items-center justify-center gap-1">
                  <CheckCircle size={10} /> Completed
                </p>
              </div>
            </div>
            {d.audits.avgScore !== null && (
              <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
                <ScoreRing score={d.audits.avgScore} size={56} />
                <div>
                  <p className={`text-2xl font-bold ${scoreColorClass(d.audits.avgScore)}`}>{d.audits.avgScore}</p>
                  <p className="text-sm text-gray-600">Average audit score</p>
                  <p className="text-xs text-gray-400">from {d.audits.completed} completed audit{d.audits.completed !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )}
            {d.audits.total === 0 && (
              <div className="text-center text-gray-400 text-sm py-4">
                No audits created yet. Open a client to start one.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Studio summary */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Bot size={16} className="text-primary-700" />
            AI Studio · {monthName}
          </h2>
          <Link to="/ai-studio/usage" className="text-xs text-primary-600 hover:text-primary-700 font-medium">Full report →</Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900">{d.aiUsage.totalCalls}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total AI calls</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-2xl font-bold text-green-700">{cacheRate}%</p>
            <p className="text-xs text-green-600 mt-0.5">Cache hit rate</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-xl">
            <p className="text-2xl font-bold text-amber-700">${d.aiUsage.totalCost.toFixed(4)}</p>
            <p className="text-xs text-amber-600 mt-0.5">Cost this month</p>
          </div>
        </div>
      </div>

      {/* AI Weekly Digest */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Sparkles size={16} className="text-violet-600" />
            AI Weekly Digest
          </h2>
          <div className="flex items-center gap-2">
            {digest && (
              <button
                onClick={() => emailDigestMutation.mutate()}
                disabled={emailDigestMutation.isPending}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Mail size={13} /> {emailDigestMutation.isPending ? 'Sending…' : 'Email to me'}
              </button>
            )}
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              {generateMutation.isPending
                ? <><RefreshCw size={12} className="animate-spin" /> Generating…</>
                : <><Sparkles size={12} /> {digest ? 'Regenerate' : 'Generate Digest'}</>}
            </button>
          </div>
        </div>
        <div className="p-6">
          {digestLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : !digest ? (
            <div className="text-center py-8">
              <Sparkles size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium text-sm">No digest generated yet</p>
              <p className="text-gray-400 text-xs mt-1">Generate a weekly AI summary of your agency's performance</p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-400 mb-3">Generated {new Date(digest.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {digest.weekLabel}</p>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-violet-50/40 rounded-xl p-4 border border-violet-100">
                {digest.content}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent posts */}
      {d.recentPosts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Recent Posts</h2>
            <Link to="/content" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {d.recentPosts.map(post => (
              <Link
                key={post.id}
                to={`/content/${post.id}/edit`}
                className="flex items-start gap-3 px-6 py-3 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    {post.platforms.slice(0, 3).map(p => (
                      <span key={p} className={`text-xs text-white px-1.5 py-0.5 rounded font-medium ${PLATFORM_BG[p] ?? 'bg-gray-500'}`}>
                        {PLATFORM_LABELS[p] ?? p}
                      </span>
                    ))}
                    {post.platforms.length > 3 && <span className="text-xs text-gray-400">+{post.platforms.length - 3}</span>}
                    {post.aiGenerated && <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">AI</span>}
                  </div>
                  <p className="text-sm text-gray-800 truncate group-hover:text-primary-700">{post.caption}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{post.client.name} · {post.createdBy.name} · {new Date(post.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${
                  post.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                  post.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {STATUS_LABELS[post.status] ?? post.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
