import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Sparkles, RefreshCw, ChevronLeft, BarChart2,
  Heart, MessageCircle, Bookmark, Share2, Eye, Check, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api/client';

interface ClientBasic { id: string; name: string; status: string }

interface PostWithPerf {
  id: string;
  caption: string;
  platforms: string[];
  scheduledAt: string | null;
  status: string;
  createdAt: string;
  performance: {
    reach: number; likes: number; comments: number;
    saves: number; shares: number; engagementRate: number;
    impressions?: number; loggedAt: string;
  } | null;
}

interface AIInsights {
  summary: string;
  topContentTypes: { type: string; insight: string; avgEngagement: number }[];
  bestPlatform: { platform: string; avgEngagement: number; reason: string } | null;
  worstPlatform: { platform: string; avgEngagement: number; reason: string } | null;
  recommendations: { action: string; reason: string; impact: 'high' | 'med' | 'low' }[];
  cached: boolean;
}

const PLATFORM_BG: Record<string, string> = {
  LINKEDIN: 'bg-blue-600', INSTAGRAM: 'bg-pink-500', FACEBOOK: 'bg-blue-500',
  GBP: 'bg-green-600', YOUTUBE: 'bg-red-600', TWITTER: 'bg-sky-500',
  TIKTOK: 'bg-gray-800', PINTEREST: 'bg-red-500', GOOGLE_ADS: 'bg-yellow-500',
  EMAIL: 'bg-purple-600', WHATSAPP: 'bg-green-500',
};
const PLATFORM_LABEL: Record<string, string> = {
  LINKEDIN: 'LI', INSTAGRAM: 'IG', FACEBOOK: 'FB', GBP: 'GBP',
  YOUTUBE: 'YT', TWITTER: 'TW', TIKTOK: 'TT', PINTEREST: 'PIN',
  GOOGLE_ADS: 'GAds', EMAIL: 'Email', WHATSAPP: 'WA',
};

const IMPACT_COLOR: Record<string, string> = {
  high: 'bg-green-100 text-green-700',
  med: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-500',
};

function erColor(rate: number) {
  if (rate >= 5) return 'text-green-600';
  if (rate >= 2) return 'text-yellow-500';
  return 'text-red-500';
}

function MetricChip({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <Icon size={11} className="flex-shrink-0" />
      <span className="font-medium text-gray-700">{value.toLocaleString('en-IN')}</span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

interface LogForm { reach: string; likes: string; comments: string; saves: string; shares: string; impressions: string }
const emptyForm: LogForm = { reach: '', likes: '', comments: '', saves: '', shares: '', impressions: '' };

export default function ContentPerformance() {
  const qc = useQueryClient();
  const [clientId, setClientId] = useState('');
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [form, setForm] = useState<LogForm>(emptyForm);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ data: ClientBasic[] }>('/clients'),
    staleTime: 60_000,
  });
  const clients = (clientsData?.data ?? []).filter(c => c.status === 'ACTIVE');

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['posts-performance', clientId],
    queryFn: () =>
      api.get<{ data: PostWithPerf[] }>(`/posts?status=PUBLISHED&limit=50${clientId ? `&clientId=${clientId}` : ''}`),
    enabled: true,
  });
  const posts = postsData?.data ?? [];

  const postsWithData = posts.filter(p => p.performance !== null);
  const avgER = postsWithData.length
    ? (postsWithData.reduce((s, p) => s + (p.performance!.engagementRate), 0) / postsWithData.length).toFixed(2)
    : null;

  const logMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, number> }) =>
      api.put(`/posts/${id}/performance`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts-performance', clientId] });
      setLoggingId(null);
      setForm(emptyForm);
      toast.success('Performance metrics saved');
    },
    onError: () => toast.error('Failed to save metrics'),
  });

  const handleLog = (postId: string) => {
    if (!form.reach) { toast.error('Reach is required'); return; }
    logMutation.mutate({
      id: postId,
      data: {
        reach: Number(form.reach),
        likes: Number(form.likes) || 0,
        comments: Number(form.comments) || 0,
        saves: Number(form.saves) || 0,
        shares: Number(form.shares) || 0,
        ...(form.impressions ? { impressions: Number(form.impressions) } : {}),
      },
    });
  };

  const generateInsights = async () => {
    if (postsWithData.length < 2) {
      toast.error('Log metrics for at least 2 posts to generate insights');
      return;
    }
    if (!clientId) { toast.error('Select a client to generate insights'); return; }
    setInsightsLoading(true);
    setInsights(null);
    try {
      const res = await api.post<{ data: AIInsights }>('/ai/performance-insights', {
        clientId,
        posts: postsWithData.map(p => ({
          caption: p.caption,
          platforms: p.platforms,
          scheduledAt: p.scheduledAt,
          reach: p.performance!.reach,
          likes: p.performance!.likes,
          comments: p.performance!.comments,
          saves: p.performance!.saves,
          shares: p.performance!.shares,
          engagementRate: p.performance!.engagementRate,
        })),
      });
      setInsights(res.data);
      toast.success('AI insights generated');
    } catch {
      toast.error('Failed to generate insights');
    } finally {
      setInsightsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/content" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content Performance</h1>
            <p className="text-sm text-gray-500 mt-0.5">Log actual metrics for published posts and get AI-powered insights.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            value={clientId}
            onChange={e => { setClientId(e.target.value); setInsights(null); }}
          >
            <option value="">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            onClick={generateInsights}
            disabled={insightsLoading || postsWithData.length < 2}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {insightsLoading ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {insightsLoading ? 'Analysing…' : 'AI Insights'}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Published Posts', value: posts.length, icon: BarChart2, color: 'bg-violet-50 text-violet-600' },
          { label: 'Metrics Logged', value: postsWithData.length, icon: Check, color: 'bg-green-50 text-green-600' },
          { label: 'Avg Engagement Rate', value: avgER ? `${avgER}%` : '—', icon: TrendingUp, color: 'bg-primary-50 text-primary-700' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Insights panel */}
      {insights && (
        <div className="card p-6 border border-violet-100 bg-violet-50/30 space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-violet-600" />
            <h2 className="font-semibold text-gray-800">AI Performance Insights</h2>
            {insights.cached && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Cached</span>}
          </div>

          <p className="text-sm text-gray-700 leading-relaxed">{insights.summary}</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Content types */}
            {insights.topContentTypes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top Content Types</p>
                <div className="space-y-2">
                  {insights.topContentTypes.map((ct, i) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">{ct.type}</span>
                        <span className={`text-sm font-bold ${erColor(ct.avgEngagement)}`}>{ct.avgEngagement.toFixed(1)}% ER</span>
                      </div>
                      <p className="text-xs text-gray-500">{ct.insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Platform comparison */}
            <div className="space-y-3">
              {insights.bestPlatform && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Best Platform</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">{insights.bestPlatform.platform}</span>
                    <span className="text-sm font-bold text-green-600">{insights.bestPlatform.avgEngagement.toFixed(1)}% avg ER</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{insights.bestPlatform.reason}</p>
                </div>
              )}
              {insights.worstPlatform && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Needs Improvement</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">{insights.worstPlatform.platform}</span>
                    <span className="text-sm font-bold text-red-600">{insights.worstPlatform.avgEngagement.toFixed(1)}% avg ER</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{insights.worstPlatform.reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {insights.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recommendations</p>
              <div className="space-y-2">
                {insights.recommendations.map((r, i) => (
                  <div key={i} className="bg-white border border-gray-100 rounded-lg p-3 flex items-start gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 mt-0.5 ${IMPACT_COLOR[r.impact]}`}>
                      {r.impact}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.action}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Posts list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <BarChart2 size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-base font-medium text-gray-600">No published posts yet</p>
          <p className="text-sm mt-1">Posts must be published before you can log performance data.</p>
          <Link to="/content/new" className="btn-primary mt-4 inline-flex">Create a Post</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(post => {
            const perf = post.performance;
            const isLogging = loggingId === post.id;
            const isExpanded = expandedPost === post.id;

            return (
              <div key={post.id} className={`card overflow-hidden transition-all ${perf ? 'border-l-4 border-l-green-400' : ''}`}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Platform chips */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                        {post.platforms.slice(0, 4).map(p => (
                          <span key={p} className={`text-xs text-white px-1.5 py-0.5 rounded font-medium ${PLATFORM_BG[p] ?? 'bg-gray-500'}`}>
                            {PLATFORM_LABEL[p] ?? p}
                          </span>
                        ))}
                        {post.scheduledAt && (
                          <span className="text-xs text-gray-400">
                            {new Date(post.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>

                      {/* Caption */}
                      <p className={`text-sm text-gray-800 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {post.caption}
                      </p>
                      {post.caption.length > 160 && (
                        <button
                          className="text-xs text-primary-600 hover:underline mt-0.5 flex items-center gap-0.5"
                          onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                        >
                          {isExpanded ? <><ChevronUp size={11} /> Less</> : <><ChevronDown size={11} /> More</>}
                        </button>
                      )}
                    </div>

                    {/* Right side — ER or Log button */}
                    <div className="flex-shrink-0 text-right">
                      {perf ? (
                        <div className="text-right">
                          <p className={`text-xl font-black ${erColor(perf.engagementRate)}`}>{perf.engagementRate.toFixed(1)}%</p>
                          <p className="text-xs text-gray-400">ER</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setLoggingId(isLogging ? null : post.id); setForm(emptyForm); }}
                          className="text-xs px-3 py-1.5 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium"
                        >
                          + Log Metrics
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Existing metrics display */}
                  {perf && (
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <MetricChip icon={Eye} value={perf.reach} label="reach" />
                      <MetricChip icon={Heart} value={perf.likes} label="likes" />
                      <MetricChip icon={MessageCircle} value={perf.comments} label="comments" />
                      <MetricChip icon={Bookmark} value={perf.saves} label="saves" />
                      <MetricChip icon={Share2} value={perf.shares} label="shares" />
                      <button
                        onClick={() => { setLoggingId(isLogging ? null : post.id); setForm({ reach: String(perf.reach), likes: String(perf.likes), comments: String(perf.comments), saves: String(perf.saves), shares: String(perf.shares), impressions: String(perf.impressions ?? '') }); }}
                        className="text-xs text-gray-400 hover:text-primary-600 underline"
                      >
                        Edit
                      </button>
                      <span className="text-xs text-gray-300 ml-auto">
                        Logged {new Date(perf.loggedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Inline log form */}
                {isLogging && (
                  <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-600 mb-3">
                      {perf ? 'Update performance metrics' : 'Log performance metrics'}
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                      {[
                        { key: 'reach', label: 'Reach *', placeholder: '5000', icon: Eye },
                        { key: 'likes', label: 'Likes', placeholder: '420', icon: Heart },
                        { key: 'comments', label: 'Comments', placeholder: '35', icon: MessageCircle },
                        { key: 'saves', label: 'Saves', placeholder: '80', icon: Bookmark },
                        { key: 'shares', label: 'Shares', placeholder: '25', icon: Share2 },
                        { key: 'impressions', label: 'Impressions', placeholder: '8000', icon: Eye },
                      ].map(field => {
                        const Icon = field.icon;
                        return (
                          <div key={field.key}>
                            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                              <Icon size={10} /> {field.label}
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder={field.placeholder}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                              value={form[field.key as keyof LogForm]}
                              onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                            />
                          </div>
                        );
                      })}
                    </div>
                    {form.reach && form.likes && (
                      <p className="text-xs text-gray-500 mb-3">
                        Calculated ER: <span className={`font-bold ${erColor(((Number(form.likes) + Number(form.comments) + Number(form.saves) + Number(form.shares)) / Number(form.reach) * 100))}`}>
                          {((Number(form.likes) + Number(form.comments) + Number(form.saves) + Number(form.shares)) / Number(form.reach) * 100).toFixed(2)}%
                        </span>
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLog(post.id)}
                        disabled={logMutation.isPending}
                        className="btn-primary flex items-center gap-1.5 text-sm py-1.5 disabled:opacity-50"
                      >
                        {logMutation.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                        Save Metrics
                      </button>
                      <button
                        onClick={() => { setLoggingId(null); setForm(emptyForm); }}
                        className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
