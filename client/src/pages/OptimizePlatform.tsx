import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Clock, Minus,
  Sparkles, ChevronDown, ChevronUp, Flag,
} from 'lucide-react';
import { api } from '../api/client';

interface EnrichedCheck {
  id: string;
  checkId: string;
  status: 'PENDING' | 'PASS' | 'WARN' | 'FAIL' | 'NA';
  score: number | null;
  notes: string | null;
  aiSuggestion: string | null;
  manualInput: string | null;
  updatedAt: string;
  name: string;
  description?: string;
  benchmark?: string;
  category: string;
  defWeight: number;
  aiRewriteEnabled: boolean;
}

interface OptimizationData {
  id: string;
  platform: string;
  score: number;
  checks: EnrichedCheck[];
  scoreHistory: { score: number; recordedAt: string }[];
}

interface ClientBasic { id: string; name: string }

const PLATFORM_META: Record<string, { label: string; bg: string }> = {
  LINKEDIN:   { label: 'LinkedIn',     bg: 'bg-blue-600' },
  INSTAGRAM:  { label: 'Instagram',   bg: 'bg-pink-500' },
  FACEBOOK:   { label: 'Facebook',    bg: 'bg-blue-500' },
  GBP:        { label: 'Google Business Profile', bg: 'bg-green-600' },
  YOUTUBE:    { label: 'YouTube',     bg: 'bg-red-600' },
  TWITTER:    { label: 'X / Twitter', bg: 'bg-sky-500' },
  TIKTOK:     { label: 'TikTok',      bg: 'bg-gray-900' },
  PINTEREST:  { label: 'Pinterest',   bg: 'bg-red-500' },
  GOOGLE_ADS: { label: 'Google Ads',  bg: 'bg-yellow-500' },
  EMAIL:      { label: 'Email',       bg: 'bg-purple-600' },
  WHATSAPP:   { label: 'WhatsApp',    bg: 'bg-green-500' },
};

const STATUS_OPTIONS = [
  { value: 'PASS',    label: 'Pass',    Icon: CheckCircle2,  color: 'text-green-600',  ring: 'border-green-300 bg-green-50' },
  { value: 'WARN',    label: 'Warn',    Icon: AlertTriangle, color: 'text-yellow-600', ring: 'border-yellow-300 bg-yellow-50' },
  { value: 'FAIL',    label: 'Fail',    Icon: XCircle,       color: 'text-red-500',    ring: 'border-red-300 bg-red-50' },
  { value: 'NA',      label: 'N/A',     Icon: Minus,         color: 'text-gray-400',   ring: 'border-gray-200 bg-gray-50' },
  { value: 'PENDING', label: 'Pending', Icon: Clock,         color: 'text-blue-400',   ring: 'border-blue-200 bg-blue-50' },
];

function statusOpt(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[4];
}

function scoreColor(score: number) {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#d97706';
  return '#dc2626';
}

function ScoreGauge({ score }: { score: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const col = scoreColor(score);
  return (
    <svg width="104" height="104" viewBox="0 0 104 104">
      <circle cx="52" cy="52" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
      <circle cx="52" cy="52" r={r} fill="none" stroke={col} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 52 52)" />
      <text x="52" y="48" textAnchor="middle" fontSize="22" fontWeight="800" fill={col}>{score}</text>
      <text x="52" y="64" textAnchor="middle" fontSize="11" fill="#94a3b8">/ 100</text>
    </svg>
  );
}

function CheckRow({
  check, clientId, platform,
}: {
  check: EnrichedCheck;
  clientId: string;
  platform: string;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(check.notes ?? '');
  const [manualInput, setManualInput] = useState(check.manualInput ?? '');
  const [loadingAI, setLoadingAI] = useState(false);
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.put(`/optimization/${clientId}/${platform}/check/${check.checkId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['optimization-platform', clientId, platform] }),
  });

  async function getAI() {
    setLoadingAI(true);
    try {
      await api.post(`/optimization/${clientId}/${platform}/ai-suggest/${check.checkId}`, {});
      qc.invalidateQueries({ queryKey: ['optimization-platform', clientId, platform] });
    } finally {
      setLoadingAI(false);
    }
  }

  function saveNotes() {
    if (notes !== (check.notes ?? '')) updateMutation.mutate({ notes });
    if (manualInput !== (check.manualInput ?? '')) updateMutation.mutate({ manualInput });
  }

  const st = statusOpt(check.status);

  return (
    <div className={`rounded-xl border overflow-hidden transition-shadow ${check.status === 'PASS' ? 'border-green-100' : check.status === 'FAIL' ? 'border-red-100' : check.status === 'WARN' ? 'border-yellow-100' : 'border-gray-100'}`}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <st.Icon size={17} className={`flex-shrink-0 ${st.color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{check.name}</p>
          {check.description && !open && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{check.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400">{check.defWeight}×</span>
          {check.aiSuggestion && <span title="AI suggestion available"><Sparkles size={13} className="text-purple-400" /></span>}
          {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-50 space-y-4 bg-white">
          {check.description && <p className="text-sm text-gray-600">{check.description}</p>}
          {check.benchmark && (
            <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-amber-800">
              <Flag size={12} className="mt-0.5 flex-shrink-0" />
              <span><strong>Benchmark:</strong> {check.benchmark}</span>
            </div>
          )}

          {/* Status buttons */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateMutation.mutate({ status: opt.value })}
                  disabled={updateMutation.isPending}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${check.status === opt.value ? `${opt.ring} ${opt.color}` : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                >
                  <opt.Icon size={13} />{opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              className="input resize-none text-sm"
              rows={2}
              placeholder="Add internal notes…"
            />
          </div>

          {/* Manual input for metrics */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Current Value / Evidence</p>
            <input
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              onBlur={saveNotes}
              className="input text-sm"
              placeholder="e.g. 72 score, 4.7★ rating, 3x/week posting…"
            />
          </div>

          {/* AI Suggestion */}
          {check.aiSuggestion ? (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-700">
                  <Sparkles size={13} /> AI Recommendation
                </span>
                <button onClick={getAI} disabled={loadingAI} className="text-xs text-purple-500 hover:text-purple-700">
                  {loadingAI ? 'Refreshing…' : '↺ Refresh'}
                </button>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{check.aiSuggestion}</p>
            </div>
          ) : (
            <button
              onClick={getAI}
              disabled={loadingAI}
              className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              <Sparkles size={15} />
              {loadingAI ? 'Getting AI suggestion…' : 'Get AI Recommendation'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function OptimizePlatform() {
  const { clientId, platform } = useParams<{ clientId: string; platform: string }>();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const qc = useQueryClient();
  const platformUpper = platform?.toUpperCase() ?? '';
  const meta = PLATFORM_META[platformUpper];

  const { data: clientData } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => api.get<{ data: ClientBasic }>(`/clients/${clientId}`),
    enabled: !!clientId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['optimization-platform', clientId, platformUpper],
    queryFn: () => api.get<{ data: OptimizationData }>(`/optimization/${clientId}/${platformUpper}`),
    enabled: !!clientId && !!platformUpper,
  });

  const opt = data?.data;
  const checks = opt?.checks ?? [];

  // Group checks by category
  const categories = [...new Set(checks.map(c => c.category))];
  const visibleChecks = activeCategory
    ? checks.filter(c => c.category === activeCategory)
    : checks;

  const passed = checks.filter(c => c.status === 'PASS').length;
  const warned = checks.filter(c => c.status === 'WARN').length;
  const failed = checks.filter(c => c.status === 'FAIL').length;
  const pending = checks.filter(c => c.status === 'PENDING').length;

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-10 w-64 bg-gray-100 rounded-xl animate-pulse" />
      <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
      <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to={`/optimize/${clientId}`} className="mt-1 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 flex-shrink-0">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to={`/clients/${clientId}`} className="hover:text-primary-600">{clientData?.data?.name ?? '…'}</Link>
            <span>/</span>
            <Link to={`/optimize/${clientId}`} className="hover:text-primary-600">Optimizer</Link>
            <span>/</span>
            <span>{meta?.label ?? platformUpper}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{meta?.label ?? platformUpper}</h1>
            <span className={`text-xs font-bold text-white px-2.5 py-1 rounded-lg ${meta?.bg ?? 'bg-gray-500'}`}>
              {platformUpper}
            </span>
          </div>
        </div>
      </div>

      {/* Score + stats summary */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="card p-4 flex items-center gap-4">
          {opt && <ScoreGauge score={opt.score} />}
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-green-600 font-medium"><CheckCircle2 size={15} />{passed} passed</div>
            <div className="flex items-center gap-2 text-yellow-600 font-medium"><AlertTriangle size={15} />{warned} warnings</div>
            <div className="flex items-center gap-2 text-red-500 font-medium"><XCircle size={15} />{failed} failed</div>
            <div className="flex items-center gap-2 text-gray-400"><Clock size={15} />{pending} pending</div>
          </div>
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['optimization-platform', clientId, platformUpper] })}
          className="btn-secondary text-sm"
        >
          ↺ Refresh scores
        </button>
      </div>

      <div className="flex gap-5">
        {/* Category sidebar */}
        {categories.length > 1 && (
          <div className="w-40 flex-shrink-0 space-y-1">
            <button
              onClick={() => setActiveCategory(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === null ? 'bg-primary-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              All
            </button>
            {categories.map(cat => {
              const catChecks = checks.filter(c => c.category === cat);
              const catPassed = catChecks.filter(c => c.status === 'PASS').length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-1 ${activeCategory === cat ? 'bg-primary-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <span className="truncate capitalize">{cat}</span>
                  <span className={`text-xs flex-shrink-0 ${activeCategory === cat ? 'text-white opacity-70' : 'text-gray-400'}`}>{catPassed}/{catChecks.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Checks list */}
        <div className="flex-1 min-w-0 space-y-2">
          {visibleChecks.length === 0 ? (
            <div className="card p-10 text-center text-gray-400">No checks for this platform yet.</div>
          ) : (
            visibleChecks.map(check => (
              <CheckRow
                key={check.id}
                check={check}
                clientId={clientId!}
                platform={platformUpper}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
