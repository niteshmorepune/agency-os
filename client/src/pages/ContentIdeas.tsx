import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Lightbulb, Sparkles, RefreshCw, Save, Trash2, PenSquare, ChevronDown, ChevronUp, Flame, Send, ExternalLink, Target } from 'lucide-react';
import { api } from '../api/client';
import { SafeAIOutput } from '../lib/safeAI';
import { useAuthStore } from '../store/auth.store';

interface ClientBasic {
  id: string;
  name: string;
  status: string;
}

interface ContentIdea {
  id: string;
  clientId: string;
  platform: string;
  title: string;
  format: string;
  hook: string;
  outline: string;
  status: string;
  source: 'MANUAL' | 'AI_TREND' | 'AI_COMPETITOR_GAP';
  trendRationale: string | null;
  sourceRefs: string[];
  promoted: boolean;
  createdAt: string;
  client: { name: string };
}

const PLATFORMS = [
  'LINKEDIN', 'INSTAGRAM', 'FACEBOOK', 'TWITTER', 'TIKTOK',
  'YOUTUBE', 'PINTEREST', 'GOOGLE_ADS', 'EMAIL', 'WHATSAPP', 'GBP',
];

const PLATFORM_LABELS: Record<string, string> = {
  LINKEDIN: 'LinkedIn', INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook',
  TWITTER: 'X/Twitter', TIKTOK: 'TikTok', YOUTUBE: 'YouTube',
  PINTEREST: 'Pinterest', GOOGLE_ADS: 'Google Ads', EMAIL: 'Email',
  WHATSAPP: 'WhatsApp', GBP: 'Google Biz',
};

const PLATFORM_BG: Record<string, string> = {
  LINKEDIN: 'bg-blue-600', INSTAGRAM: 'bg-pink-500', FACEBOOK: 'bg-blue-500',
  GBP: 'bg-green-600', YOUTUBE: 'bg-red-600', TWITTER: 'bg-sky-500',
  TIKTOK: 'bg-gray-800', PINTEREST: 'bg-red-500', GOOGLE_ADS: 'bg-yellow-500',
  EMAIL: 'bg-purple-600', WHATSAPP: 'bg-green-500',
};

const IDEA_STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'SAVED', label: 'Saved' },
  { key: 'USED', label: 'Used' },
];

function IdeaCard({ idea, canShare, onDelete, onUse, onPromote, promoting, onSendToSmdost, sendingToSmdost, sentToSmdost }: {
  idea: ContentIdea;
  canShare: boolean;
  onDelete: (id: string) => void;
  onUse: (idea: ContentIdea) => void;
  onPromote: (idea: ContentIdea) => void;
  promoting: boolean;
  onSendToSmdost: (idea: ContentIdea) => void;
  sendingToSmdost: boolean;
  sentToSmdost: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isTrend = idea.source === 'AI_TREND';
  const isGap = idea.source === 'AI_COMPETITOR_GAP';
  const isAiSourced = isTrend || isGap;
  return (
    <div className={`card p-4 space-y-2 ${idea.status === 'USED' ? 'opacity-60' : ''} ${isTrend ? 'border-orange-200 bg-orange-50/30' : ''} ${isGap ? 'border-blue-200 bg-blue-50/30' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {isTrend && (
            <span className="flex items-center gap-1 text-xs text-white px-2 py-0.5 rounded-full font-medium bg-orange-500">
              <Flame size={11} /> Trending
            </span>
          )}
          {isGap && (
            <span className="flex items-center gap-1 text-xs text-white px-2 py-0.5 rounded-full font-medium bg-blue-600">
              <Target size={11} /> Competitor Gap
            </span>
          )}
          <span className={`text-xs text-white px-2 py-0.5 rounded-full font-medium ${PLATFORM_BG[idea.platform] ?? 'bg-gray-500'}`}>
            {PLATFORM_LABELS[idea.platform] ?? idea.platform}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{idea.format}</span>
          {idea.status === 'USED' && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Used</span>
          )}
          {idea.promoted && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Shared with client</span>
          )}
          {sentToSmdost && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Sent to SMDost</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isAiSourced && canShare && !idea.promoted && (
            <button
              onClick={() => onPromote(idea)}
              disabled={promoting}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors font-medium disabled:opacity-50"
            >
              {promoting ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />} Share with client
            </button>
          )}
          {isAiSourced && canShare && !sentToSmdost && (
            <button
              onClick={() => onSendToSmdost(idea)}
              disabled={sendingToSmdost}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors font-medium disabled:opacity-50"
            >
              {sendingToSmdost ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />} Send to SMDost
            </button>
          )}
          {idea.status !== 'USED' && (
            <button
              onClick={() => onUse(idea)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors font-medium"
            >
              <PenSquare size={11} /> Create Post
            </button>
          )}
          <button
            onClick={() => onDelete(idea.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 text-sm leading-snug">{idea.title}</h3>

      {idea.hook && (
        <p className="text-xs text-gray-500 italic">"{idea.hook}"</p>
      )}

      {isAiSourced && idea.trendRationale && (
        <p className={`text-xs rounded-lg p-2.5 leading-relaxed ${isGap ? 'text-blue-800 bg-blue-100/70' : 'text-orange-800 bg-orange-100/70'}`}>
          <span className="font-semibold">{isGap ? 'Why this gap: ' : 'Why now: '}</span>{idea.trendRationale}
        </p>
      )}

      {idea.outline && (
        <div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Hide outline' : 'View outline'}
          </button>
          {expanded && (
            <div className="mt-1.5 space-y-2">
              <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-2.5">{idea.outline}</p>
              {isAiSourced && idea.sourceRefs.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {idea.sourceRefs.map((ref, i) => (
                    <a
                      key={i}
                      href={ref.startsWith('http') ? ref : `https://${ref}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-primary-600 bg-gray-50 hover:bg-gray-100 rounded-full px-2 py-0.5"
                    >
                      <ExternalLink size={10} /> {ref.replace(/^https?:\/\//, '').split('/')[0]}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        {idea.client.name} · {new Date(idea.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
      </p>
    </div>
  );
}

function SaveIdeaForm({ clients, onSaved }: { clients: ClientBasic[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ clientId: '', platform: 'LINKEDIN', title: '', format: 'Post', hook: '', outline: '' });
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const save = async () => {
    if (!form.clientId || !form.title) return;
    setSaving(true);
    try {
      await api.post('/ideas', form);
      qc.invalidateQueries({ queryKey: ['ideas'] });
      setForm({ clientId: '', platform: 'LINKEDIN', title: '', format: 'Post', hook: '', outline: '' });
      setOpen(false);
      toast.success('Idea saved');
      onSaved();
    } catch { /* handled below */ } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary text-sm flex items-center gap-2 w-full justify-center border-dashed">
        <Save size={14} /> Save an Idea to Library
      </button>
    );
  }

  return (
    <div className="card p-5 space-y-3 border-primary-200 bg-primary-50/30">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 text-sm">Save Idea to Library</h4>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><span className="text-lg leading-none">×</span></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Client</label>
          <select className="input text-sm" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
            <option value="">Select client...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">Platform</label>
          <select className="input text-sm" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
            {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label text-xs">Title / Idea Name</label>
        <input className="input text-sm" placeholder="E.g. 5 LinkedIn mistakes founders make..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Format</label>
          <select className="input text-sm" value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}>
            {['Post', 'Carousel', 'Reel', 'Story', 'Thread', 'Video', 'Poll', 'Newsletter'].map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Hook (optional)</label>
          <input className="input text-sm" placeholder="Opening line..." value={form.hook} onChange={e => setForm(f => ({ ...f, hook: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="label text-xs">Outline (optional)</label>
        <textarea className="input text-sm min-h-[60px] resize-none" placeholder="Key points to cover..." value={form.outline} onChange={e => setForm(f => ({ ...f, outline: e.target.value }))} />
      </div>
      <button onClick={save} disabled={saving || !form.clientId || !form.title} className="btn-primary text-sm w-full">
        {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
        Save Idea
      </button>
    </div>
  );
}

export default function ContentIdeas() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canShare = user?.role === 'OWNER' || user?.role === 'ACCOUNT_MANAGER';
  const [tab, setTab] = useState<'generate' | 'saved'>('generate');
  const [statusFilter, setStatusFilter] = useState('SAVED');
  const [clientFilter, setClientFilter] = useState('');

  // Generate tab state
  const [genClient, setGenClient] = useState('');
  const [genPlatform, setGenPlatform] = useState('LINKEDIN');
  const [genNiche, setGenNiche] = useState('');
  const [genGoal, setGenGoal] = useState('');
  const [genResult, setGenResult] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ data: ClientBasic[] }>('/clients'),
    staleTime: 60_000,
  });
  const clients = (clientsData?.data ?? []).filter(c => c.status === 'ACTIVE');

  const { data: ideasData, isLoading: ideasLoading } = useQuery({
    queryKey: ['ideas', clientFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (clientFilter) params.set('clientId', clientFilter);
      if (statusFilter) params.set('status', statusFilter);
      return api.get<{ data: ContentIdea[] }>(`/ideas?${params}`);
    },
    enabled: tab === 'saved',
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/ideas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ideas'] }); toast.success('Idea deleted'); },
    onError: () => toast.error('Failed to delete idea'),
  });

  const markUsedMutation = useMutation({
    mutationFn: ({ id, postId }: { id: string; postId: string }) =>
      api.patch(`/ideas/${id}`, { status: 'USED', usedInPost: postId }),
  });
  void markUsedMutation;

  const promoteMutation = useMutation({
    mutationFn: (id: string) => api.post(`/ideas/${id}/promote`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ideas'] }); toast.success('Shared with client'); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to share with client'),
  });

  // Not persisted server-side -- the CRM is the source of truth for whether a
  // brief already exists (idempotent per idea, see crmBridge.service.ts on
  // the Drishti server). This just gives immediate UI feedback within the
  // session; a page reload re-shows the button, and a repeat click is still
  // safe (the CRM responds "already sent" instead of duplicating the brief).
  const [sentToSmdostIds, setSentToSmdostIds] = useState<Set<string>>(new Set());
  const sendToSmdostMutation = useMutation({
    mutationFn: (id: string) => api.post<{ data: { briefId: string } }>(`/ideas/${id}/send-to-smdost`, {}),
    onSuccess: (_res, id) => {
      setSentToSmdostIds(prev => new Set(prev).add(id));
      toast.success('Sent to SMDost as a content brief');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to send to SMDost'),
  });

  const findTrendsMutation = useMutation({
    mutationFn: (clientId: string) => api.post<{ data: unknown[] }>('/ai/trend-ideas', { clientId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['ideas'] });
      toast.success(res.data.length > 0 ? `Found ${res.data.length} trending idea(s)` : 'No strong trends found for this client right now');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to research trends'),
  });

  const findGapsMutation = useMutation({
    mutationFn: (clientId: string) => api.post<{ data: unknown[] }>('/ai/competitor-gap-ideas', { clientId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['ideas'] });
      toast.success(res.data.length > 0 ? `Found ${res.data.length} competitor gap idea(s)` : 'No competitor gaps found — add competitors on the client profile first, or none found right now');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to research competitor gaps'),
  });

  const generate = async () => {
    if (!genNiche) return;
    setGenLoading(true);
    setGenError('');
    try {
      const res = await api.post<{ data: string }>('/ai/post-ideas', {
        platform: PLATFORM_LABELS[genPlatform] ?? genPlatform,
        niche: genNiche,
        goal: genGoal || undefined,
        clientId: genClient || undefined,
      });
      setGenResult(res.data);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenLoading(false);
    }
  };

  const useIdea = (idea: ContentIdea) => {
    navigate(`/content/new?clientId=${idea.clientId}&caption=${encodeURIComponent(idea.hook || idea.title)}&platform=${idea.platform}`);
  };

  const ideas = ideasData?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/content" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 flex-shrink-0">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-0.5">
            <Link to="/content" className="hover:text-primary-600">Content Studio</Link>
            <span>/</span>
            <span>Ideas Engine</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Lightbulb size={20} className="text-primary-700" /> Ideas Engine
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { key: 'generate', label: 'AI Generate' },
          { key: 'saved', label: 'Saved Ideas' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'generate' | 'saved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'generate' && (
        <div className="space-y-5">
          {/* Generator inputs */}
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-gray-700">Generate 30 Content Ideas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Platform</label>
                <select className="input" value={genPlatform} onChange={e => setGenPlatform(e.target.value)}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Client context (optional)</label>
                <select className="input" value={genClient} onChange={e => setGenClient(e.target.value)}>
                  <option value="">No client context</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Niche <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="E.g. B2B SaaS, Restaurant, Fitness"
                  value={genNiche}
                  onChange={e => setGenNiche(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Goal (optional)</label>
                <select className="input" value={genGoal} onChange={e => setGenGoal(e.target.value)}>
                  <option value="">Any goal</option>
                  {['Engagement & growth', 'Lead generation', 'Brand awareness', 'Sales conversion', 'Community building'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            {genError && <p className="text-red-600 text-sm">{genError}</p>}
            <button onClick={generate} disabled={genLoading || !genNiche} className="btn-primary w-full">
              {genLoading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {genLoading ? 'Generating ideas...' : 'Generate 30 Ideas'}
            </button>
          </div>

          {genResult && (
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">Generated Ideas</h3>
                <button
                  onClick={() => setTab('saved')}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  View saved ideas →
                </button>
              </div>
              <SafeAIOutput content={genResult.replace(/\n/g, '<br>')} className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" />
              <div className="pt-2 border-t border-gray-100">
                <SaveIdeaForm clients={clients} onSaved={() => setTab('saved')} />
              </div>
            </div>
          )}

          {!genResult && (
            <SaveIdeaForm clients={clients} onSaved={() => setTab('saved')} />
          )}
        </div>
      )}

      {tab === 'saved' && (
        <div className="space-y-4">
          {/* Saved filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
            >
              <option value="">All clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {IDEA_STATUS_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setStatusFilter(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => clientFilter && findTrendsMutation.mutate(clientFilter)}
              disabled={!clientFilter || findTrendsMutation.isPending}
              title={clientFilter ? 'Research current trends for this client' : 'Select a client above first'}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {findTrendsMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Flame size={14} />}
              Find Trending Ideas
            </button>
            <button
              onClick={() => clientFilter && findGapsMutation.mutate(clientFilter)}
              disabled={!clientFilter || findGapsMutation.isPending}
              title={clientFilter ? 'Research what this client\'s competitors are covering that they aren\'t' : 'Select a client above first'}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {findGapsMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Target size={14} />}
              Find Competitor Gaps
            </button>
          </div>

          {ideasLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : ideas.length === 0 ? (
            <div className="card p-12 text-center">
              <Lightbulb size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No ideas saved yet. Use the AI Generate tab to create ideas.</p>
              <button onClick={() => setTab('generate')} className="btn-primary mt-4 text-sm">Generate Ideas</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ideas.map(idea => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  canShare={canShare}
                  onDelete={id => deleteMutation.mutate(id)}
                  onUse={useIdea}
                  onPromote={i => promoteMutation.mutate(i.id)}
                  promoting={promoteMutation.isPending && promoteMutation.variables === idea.id}
                  onSendToSmdost={i => sendToSmdostMutation.mutate(i.id)}
                  sendingToSmdost={sendToSmdostMutation.isPending && sendToSmdostMutation.variables === idea.id}
                  sentToSmdost={sentToSmdostIds.has(idea.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
