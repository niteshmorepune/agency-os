import { useState } from 'react';
import { ChevronLeft, TrendingUp, Sparkles, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../api/client';

interface ClientBasic { id: string; name: string; status: string }

const PLATFORMS = ['Instagram', 'LinkedIn', 'Facebook', 'Twitter', 'TikTok', 'YouTube', 'Pinterest'];

const RATING_CONFIG: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  excellent:     { label: 'Excellent',     color: 'text-emerald-700', bg: 'bg-emerald-50',  ring: 'border-emerald-300' },
  good:          { label: 'Good',          color: 'text-green-700',   bg: 'bg-green-50',    ring: 'border-green-300' },
  average:       { label: 'Average',       color: 'text-yellow-700',  bg: 'bg-yellow-50',   ring: 'border-yellow-300' },
  below_average: { label: 'Below Average', color: 'text-orange-700',  bg: 'bg-orange-50',   ring: 'border-orange-300' },
  poor:          { label: 'Poor',          color: 'text-red-700',     bg: 'bg-red-50',       ring: 'border-red-300' },
};

interface EngagementResult {
  engagementRate: number;
  benchmark: { good: number; avg: number; poor: number };
  rating: string;
  percentile: number;
  formula: string;
  recommendations?: string;
  cached?: boolean;
}

interface Recommendation {
  recommendation: string;
  impact: 'high' | 'med' | 'low';
  effort: 'high' | 'med' | 'low';
}

const IMPACT_COLORS: Record<string, string> = {
  high: 'bg-green-100 text-green-700',
  med:  'bg-yellow-100 text-yellow-700',
  low:  'bg-gray-100 text-gray-600',
};

export default function EngagementAnalyzer() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState('Instagram');
  const [followers, setFollowers] = useState('');
  const [avgLikes, setAvgLikes] = useState('');
  const [avgComments, setAvgComments] = useState('');
  const [avgShares, setAvgShares] = useState('');
  const [avgReach, setAvgReach] = useState('');
  const [industry, setIndustry] = useState('');
  const [clientId, setClientId] = useState('');
  const [result, setResult] = useState<EngagementResult | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ data: ClientBasic[] }>('/clients'),
    staleTime: 60_000,
  });
  const clients = (clientsData?.data ?? []).filter(c => c.status === 'ACTIVE');

  const handleAnalyze = async () => {
    if (!followers || !avgLikes) { toast.error('Followers and avg likes are required'); return; }
    setLoading(true);
    try {
      const res = await api.post<{ data: EngagementResult }>('/ai/engagement-analyze', {
        platform,
        followers: Number(followers),
        avgLikes: Number(avgLikes),
        avgComments: Number(avgComments) || 0,
        avgShares: Number(avgShares) || 0,
        avgReach: avgReach ? Number(avgReach) : undefined,
        industry: industry || undefined,
        clientId: clientId || undefined,
      });
      setResult(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  };

  const ratingCfg = result ? RATING_CONFIG[result.rating] : null;

  let recommendations: Recommendation[] = [];
  if (result?.recommendations) {
    try {
      recommendations = JSON.parse(result.recommendations);
    } catch { /* not JSON, show raw */ }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/ai-studio')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0">
          <ChevronLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Engagement Rate Analyzer</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-sky-100 text-sky-700">Research</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Calculate, benchmark, and get AI recommendations to improve engagement</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-700">Account Data</h3>

          {clients.length > 0 && (
            <div>
              <label className="label">Client (optional)</label>
              <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="label">Platform</label>
            <select className="input" value={platform} onChange={e => setPlatform(e.target.value)}>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Followers <span className="text-red-400">*</span></label>
              <input type="number" className="input" placeholder="E.g. 12500" value={followers} onChange={e => setFollowers(e.target.value)} />
            </div>
            <div>
              <label className="label">Avg reach/post (optional)</label>
              <input type="number" className="input" placeholder="E.g. 3200" value={avgReach} onChange={e => setAvgReach(e.target.value)} />
            </div>
            <div>
              <label className="label">Avg likes <span className="text-red-400">*</span></label>
              <input type="number" className="input" placeholder="E.g. 420" value={avgLikes} onChange={e => setAvgLikes(e.target.value)} />
            </div>
            <div>
              <label className="label">Avg comments</label>
              <input type="number" className="input" placeholder="E.g. 35" value={avgComments} onChange={e => setAvgComments(e.target.value)} />
            </div>
            <div>
              <label className="label">Avg shares/saves</label>
              <input type="number" className="input" placeholder="E.g. 80" value={avgShares} onChange={e => setAvgShares(e.target.value)} />
            </div>
            <div>
              <label className="label">Industry (for AI)</label>
              <input type="text" className="input" placeholder="E.g. Fashion" value={industry} onChange={e => setIndustry(e.target.value)} />
            </div>
          </div>

          <button onClick={handleAnalyze} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <TrendingUp size={16} />}
            {loading ? 'Analyzing…' : 'Analyze Engagement'}
          </button>
        </div>

        {/* Result panel */}
        <div className="space-y-4">
          {result && ratingCfg ? (
            <>
              <div className={`card p-6 border-2 ${ratingCfg.ring} ${ratingCfg.bg}`}>
                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Engagement Rate</p>
                  <p className={`text-5xl font-black ${ratingCfg.color}`}>{result.engagementRate}%</p>
                  <p className={`text-sm font-semibold ${ratingCfg.color}`}>{ratingCfg.label}</p>
                  <p className="text-xs text-gray-500">Better than {result.percentile}% of accounts in your industry</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
                  <div><p className="font-semibold text-red-500">&lt;{result.benchmark.poor}%</p><p>Poor</p></div>
                  <div><p className="font-semibold text-yellow-500">{result.benchmark.avg}%</p><p>Average</p></div>
                  <div><p className="font-semibold text-green-500">&ge;{result.benchmark.good}%</p><p>Good</p></div>
                </div>
                <p className="text-xs text-gray-400 text-center mt-3">Formula: {result.formula}</p>
              </div>

              {recommendations.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-purple-600" />
                    <p className="text-sm font-semibold text-gray-700">AI Recommendations</p>
                    {result.cached && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Cached</span>}
                  </div>
                  {recommendations.map((r, i) => (
                    <div key={i} className="card p-3 space-y-1">
                      <p className="text-sm text-gray-800 leading-relaxed">{r.recommendation}</p>
                      <div className="flex gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${IMPACT_COLORS[r.impact]}`}>Impact: {r.impact}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${IMPACT_COLORS[r.effort]}`}>Effort: {r.effort}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.recommendations && recommendations.length === 0 && (
                <div className="card p-4 bg-purple-50 border-purple-100">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.recommendations}</p>
                </div>
              )}
            </>
          ) : (
            <div className="card p-12 flex flex-col items-center justify-center text-gray-300">
              <TrendingUp size={40} className="mb-3" />
              <p className="text-sm">Enter your account data to analyze engagement</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
