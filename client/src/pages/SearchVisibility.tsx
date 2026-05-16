import { useState } from 'react';
import { ChevronLeft, Search, Sparkles, RefreshCw, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../api/client';

interface ClientBasic { id: string; name: string; status: string }

interface Dimension {
  id: string;
  label: string;
  score: number;
  status: string;
  summary: string;
}

interface ActionItem {
  action: string;
  impact: 'high' | 'med' | 'low';
  effort: 'high' | 'med' | 'low';
}

interface AuditResult {
  overallScore: number;
  dimensions: Dimension[];
  quickWins: ActionItem[];
  longTerm: ActionItem[];
  cached?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; bar: string; ring: string }> = {
  excellent:     { label: 'Excellent',     color: 'text-emerald-700', bg: 'bg-emerald-50',  bar: 'bg-emerald-500', ring: 'border-emerald-300' },
  good:          { label: 'Good',          color: 'text-green-700',   bg: 'bg-green-50',    bar: 'bg-green-500',   ring: 'border-green-300' },
  average:       { label: 'Average',       color: 'text-yellow-700',  bg: 'bg-yellow-50',   bar: 'bg-yellow-400',  ring: 'border-yellow-300' },
  below_average: { label: 'Below Average', color: 'text-orange-700',  bg: 'bg-orange-50',   bar: 'bg-orange-500',  ring: 'border-orange-300' },
  poor:          { label: 'Poor',          color: 'text-red-700',     bg: 'bg-red-50',      bar: 'bg-red-500',     ring: 'border-red-300' },
};

const IMPACT_COLORS: Record<string, string> = {
  high: 'bg-green-100 text-green-700',
  med:  'bg-yellow-100 text-yellow-700',
  low:  'bg-gray-100 text-gray-600',
};

const EFFORT_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-600',
  med:  'bg-yellow-100 text-yellow-700',
  low:  'bg-blue-100 text-blue-700',
};

function ScoreBar({ score, barClass }: { score: number; barClass: string }) {
  return (
    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${barClass}`} style={{ width: `${score}%` }} />
    </div>
  );
}

export default function SearchVisibility() {
  const navigate = useNavigate();
  const [brandName, setBrandName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [keyServices, setKeyServices] = useState('');
  const [targetKeywords, setTargetKeywords] = useState('');
  const [clientId, setClientId] = useState('');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ data: ClientBasic[] }>('/clients'),
    staleTime: 60_000,
  });
  const clients = (clientsData?.data ?? []).filter(c => c.status === 'ACTIVE');

  const handleAudit = async () => {
    if (!brandName || !website || !industry || !location || !keyServices || !targetKeywords) {
      toast.error('All fields are required');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ data: AuditResult }>('/ai/search-visibility', {
        brandName,
        website,
        industry,
        location,
        keyServices,
        targetKeywords,
        clientId: clientId || undefined,
        forceRefresh: forceRefresh || undefined,
      });
      setResult(res.data);
      setForceRefresh(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Audit failed');
    } finally {
      setLoading(false);
    }
  };

  const overallCfg = result ? (STATUS_CONFIG[result.overallScore >= 80 ? 'excellent' : result.overallScore >= 60 ? 'good' : result.overallScore >= 40 ? 'average' : result.overallScore >= 20 ? 'below_average' : 'poor'] ?? STATUS_CONFIG.average) : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/ai-studio')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0">
          <ChevronLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">AI Search Visibility Audit</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-sky-100 text-sky-700">Research</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Score how visible your client is in ChatGPT, Perplexity & Google AI Overviews</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-700">Brand Details</h3>

          {clients.length > 0 && (
            <div>
              <label className="label">Client (optional)</label>
              <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Brand Name <span className="text-red-400">*</span></label>
              <input type="text" className="input" placeholder="E.g. Niranjan Enterprises" value={brandName} onChange={e => setBrandName(e.target.value)} />
            </div>
            <div>
              <label className="label">Website <span className="text-red-400">*</span></label>
              <input type="text" className="input" placeholder="E.g. niranjan.in" value={website} onChange={e => setWebsite(e.target.value)} />
            </div>
            <div>
              <label className="label">Industry <span className="text-red-400">*</span></label>
              <input type="text" className="input" placeholder="E.g. Digital Marketing" value={industry} onChange={e => setIndustry(e.target.value)} />
            </div>
            <div>
              <label className="label">Location <span className="text-red-400">*</span></label>
              <input type="text" className="input" placeholder="E.g. Pune, India" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Key Services <span className="text-red-400">*</span></label>
            <input type="text" className="input" placeholder="E.g. SEO, Social Media, Paid Ads, Content Marketing" value={keyServices} onChange={e => setKeyServices(e.target.value)} />
          </div>

          <div>
            <label className="label">Target Keywords <span className="text-red-400">*</span></label>
            <input type="text" className="input" placeholder="E.g. digital marketing agency Pune, SEO services India" value={targetKeywords} onChange={e => setTargetKeywords(e.target.value)} />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleAudit} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? 'Running Audit…' : 'Run AI Visibility Audit'}
            </button>
            {result && (
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none flex-shrink-0">
                <input type="checkbox" className="rounded" checked={forceRefresh} onChange={e => setForceRefresh(e.target.checked)} />
                Skip cache
              </label>
            )}
          </div>
        </div>

        {/* Results panel */}
        <div className="space-y-4">
          {result && overallCfg ? (
            <>
              {/* Overall score */}
              <div className={`card p-6 border-2 ${overallCfg.ring} ${overallCfg.bg}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Visibility Score</p>
                    <div className="flex items-end gap-2 mt-1">
                      <p className={`text-5xl font-black ${overallCfg.color}`}>{result.overallScore}</p>
                      <p className="text-lg text-gray-400 mb-1">/ 100</p>
                    </div>
                    <p className={`text-sm font-semibold ${overallCfg.color} mt-0.5`}>{overallCfg.label}</p>
                  </div>
                  {result.cached && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium self-start">
                      <Database size={11} /> Cached
                    </span>
                  )}
                </div>
                <div className="space-y-2.5">
                  {result.dimensions.map(dim => {
                    const cfg = STATUS_CONFIG[dim.status] ?? STATUS_CONFIG.average;
                    return (
                      <div key={dim.id}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-600 w-44 flex-shrink-0 truncate">{dim.label}</span>
                          <ScoreBar score={dim.score} barClass={cfg.bar} />
                          <span className={`text-xs font-bold w-8 text-right ${cfg.color}`}>{dim.score}</span>
                        </div>
                        <p className="text-xs text-gray-400 ml-0 leading-relaxed pl-0">{dim.summary}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Wins */}
              {result.quickWins.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-purple-600" />
                    <p className="text-sm font-semibold text-gray-700">Quick Wins</p>
                    <span className="text-xs text-gray-400">(low effort, high return)</span>
                  </div>
                  <div className="space-y-2">
                    {result.quickWins.map((item, i) => (
                      <div key={i} className="card p-3 space-y-1.5">
                        <p className="text-sm text-gray-800 leading-relaxed">{item.action}</p>
                        <div className="flex gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${IMPACT_COLORS[item.impact]}`}>Impact: {item.impact}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EFFORT_COLORS[item.effort]}`}>Effort: {item.effort}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Long-term strategies */}
              {result.longTerm.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-700">Long-Term Strategies</p>
                  </div>
                  <div className="space-y-2">
                    {result.longTerm.map((item, i) => (
                      <div key={i} className="card p-3 space-y-1.5 border-dashed">
                        <p className="text-sm text-gray-800 leading-relaxed">{item.action}</p>
                        <div className="flex gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${IMPACT_COLORS[item.impact]}`}>Impact: {item.impact}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EFFORT_COLORS[item.effort]}`}>Effort: {item.effort}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card p-12 flex flex-col items-center justify-center text-gray-300">
              <Search size={40} className="mb-3" />
              <p className="text-sm">Enter brand details to run the AI visibility audit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
