import { useState } from 'react';
import { ChevronLeft, Download, Sparkles, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../api/client';

interface ClientBasic { id: string; name: string; status: string }

const PLATFORMS = ['LinkedIn', 'Instagram', 'Facebook', 'Twitter', 'YouTube', 'TikTok', 'Pinterest', 'WhatsApp', 'Email', 'Google Ads'];
const LOCATIONS = [
  { value: 'IN', label: 'India' },
  { value: 'GLOBAL', label: 'Global' },
  { value: 'US', label: 'United States' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'UAE', label: 'UAE' },
  { value: 'AU', label: 'Australia' },
];

interface SlotData {
  day: string;
  time: string;
  rating: 'optimal' | 'acceptable' | 'avoid';
}

interface PlatformSchedule {
  recommended: string[];
  grid: SlotData[];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

const RATING_STYLE: Record<string, string> = {
  optimal: 'bg-green-500 text-white',
  acceptable: 'bg-yellow-300 text-yellow-900',
  avoid: 'bg-gray-100 text-gray-300',
};

export default function PostingTimeOptimizer() {
  const navigate = useNavigate();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['LinkedIn', 'Instagram']);
  const [location, setLocation] = useState('IN');
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [clientId, setClientId] = useState('');
  const [industry, setIndustry] = useState('');
  const [result, setResult] = useState<Record<string, PlatformSchedule> | null>(null);
  const [aiAdvice, setAiAdvice] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('');

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ data: ClientBasic[] }>('/clients'),
    staleTime: 60_000,
  });
  const clients = (clientsData?.data ?? []).filter(c => c.status === 'ACTIVE');

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleGenerate = async (customAdvice = false) => {
    if (selectedPlatforms.length === 0) { toast.error('Select at least one platform'); return; }
    setLoading(true);
    try {
      const res = await api.post<{ data: { schedule: Record<string, PlatformSchedule>; customAdvice?: string } }>(
        '/ai/posting-times',
        { platforms: selectedPlatforms, location, postsPerWeek, customAdvice, industry: industry || undefined, clientId: clientId || undefined }
      );
      setResult(res.data.schedule);
      setAiAdvice(res.data.customAdvice ?? '');
      setActiveTab(selectedPlatforms[0] ?? '');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!result) return;
    const rows = ['Platform,Day,Time,Rating'];
    for (const [platform, data] of Object.entries(result)) {
      for (const slot of data.recommended) {
        const [day, time] = slot.split(' ');
        rows.push(`${platform},${day},${time},Optimal`);
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'posting-schedule.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeSchedule = result && activeTab ? result[activeTab] : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/ai-studio')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0">
          <ChevronLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Posting Time Optimizer</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-sky-100 text-sky-700">Research</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Evidence-based optimal posting schedule per platform and audience location</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input panel */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-700">Configure Schedule</h3>

          {clients.length > 0 && (
            <div>
              <label className="label">Client context (optional)</label>
              <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="label">Audience location</label>
            <select className="input" value={location} onChange={e => setLocation(e.target.value)}>
              {LOCATIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Posts per week per platform</label>
            <input type="number" className="input" min={1} max={14} value={postsPerWeek} onChange={e => setPostsPerWeek(Number(e.target.value))} />
          </div>

          <div>
            <label className="label">Platforms</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                    selectedPlatforms.includes(p)
                      ? 'bg-primary-800 text-white border-primary-800'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Industry (for AI advice)</label>
            <input type="text" className="input" placeholder="E.g. Restaurant, SaaS, Fashion" value={industry} onChange={e => setIndustry(e.target.value)} />
          </div>

          <div className="space-y-2">
            <button onClick={() => handleGenerate(false)} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              <Clock size={16} />
              {loading ? 'Generating…' : 'Generate Schedule'}
            </button>
            {result && industry && (
              <button onClick={() => handleGenerate(true)} disabled={loading} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                <Sparkles size={14} className="text-purple-500" />
                Get AI Custom Advice
              </button>
            )}
          </div>
        </div>

        {/* Output panel */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  {selectedPlatforms.map(p => (
                    <button key={p} onClick={() => setActiveTab(p)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${activeTab === p ? 'bg-primary-800 text-white border-primary-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                      {p}
                    </button>
                  ))}
                </div>
                <button onClick={handleExportCSV} className="btn-secondary text-xs flex items-center gap-1.5">
                  <Download size={13} /> CSV
                </button>
              </div>

              {activeSchedule && (
                <div className="card p-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Recommended times for {activeTab}</p>
                    <div className="flex flex-wrap gap-2">
                      {activeSchedule.recommended.map(t => (
                        <span key={t} className="text-sm bg-green-100 text-green-800 font-medium px-2.5 py-1 rounded-lg">{t}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Weekly grid</p>
                    <div className="overflow-x-auto">
                      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `60px repeat(${DAYS.length}, 1fr)` }}>
                        <div />
                        {DAYS.map(d => <div key={d} className="text-xs font-semibold text-gray-500 text-center pb-1">{d}</div>)}
                        {HOURS.map(h => (
                          <>
                            <div key={h} className="text-xs text-gray-400 text-right pr-2 py-0.5 leading-tight">{h}</div>
                            {DAYS.map(d => {
                              const slot = activeSchedule.grid.find(g => g.day === d && g.time === h);
                              return (
                                <div
                                  key={d}
                                  title={`${d} ${h} — ${slot?.rating ?? 'avoid'}`}
                                  className={`h-5 w-8 rounded-sm text-center text-[9px] leading-5 ${RATING_STYLE[slot?.rating ?? 'avoid']}`}
                                />
                              );
                            })}
                          </>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Optimal</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-300 inline-block" /> Acceptable</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-100 inline-block" /> Avoid</span>
                    </div>
                  </div>
                </div>
              )}

              {aiAdvice && (
                <div className="card p-4 bg-purple-50 border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-purple-600" />
                    <span className="text-sm font-semibold text-purple-700">AI Custom Recommendation</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiAdvice}</p>
                </div>
              )}
            </>
          ) : (
            <div className="card p-12 flex flex-col items-center justify-center text-gray-300">
              <Clock size={40} className="mb-3" />
              <p className="text-sm">Configure inputs and generate your schedule</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
