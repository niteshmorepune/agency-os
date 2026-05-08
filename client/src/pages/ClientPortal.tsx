import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, RefreshCw, TrendingUp, FileText, CheckCircle, AlertTriangle, XCircle, Clock, Zap, CheckCircle2, Calendar, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';

interface PortalSummary {
  client: {
    id: string;
    name: string;
    domain: string;
    industry: string | null;
    brandName: string | null;
    contactName: string | null;
  } | null;
  agency: {
    name: string;
    primaryColor: string;
    accentColor: string;
    logoUrl: string | null;
    reportTagline: string | null;
  };
  optimizations: { platform: string; score: number; updatedAt: string; _count: { checks: number } }[];
  lastAudit: { id: string; name: string; overallScore: number | null; status: string; createdAt: string } | null;
  recentPosts: { id: string; caption: string; platforms: string[]; status: string; scheduledAt: string | null; createdAt: string; aiGenerated: boolean }[];
  topActions: { name: string; platform: string; status: string; weight: number }[];
  avgScore: number;
}

interface ActionItem {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

interface ClientMessage {
  id: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

const PLATFORM_META: Record<string, { label: string; bg: string }> = {
  LINKEDIN:   { label: 'LinkedIn',    bg: 'bg-blue-600' },
  INSTAGRAM:  { label: 'Instagram',   bg: 'bg-pink-500' },
  FACEBOOK:   { label: 'Facebook',    bg: 'bg-blue-500' },
  GBP:        { label: 'Google Biz',  bg: 'bg-green-600' },
  YOUTUBE:    { label: 'YouTube',     bg: 'bg-red-600' },
  TWITTER:    { label: 'X/Twitter',   bg: 'bg-sky-500' },
  TIKTOK:     { label: 'TikTok',      bg: 'bg-gray-800' },
  PINTEREST:  { label: 'Pinterest',   bg: 'bg-red-500' },
  GOOGLE_ADS: { label: 'Google Ads',  bg: 'bg-yellow-500' },
  EMAIL:      { label: 'Email',       bg: 'bg-purple-600' },
  WHATSAPP:   { label: 'WhatsApp',    bg: 'bg-green-500' },
};

const PLATFORM_ORDER = ['LINKEDIN','INSTAGRAM','FACEBOOK','GBP','YOUTUBE','TWITTER','TIKTOK','PINTEREST','GOOGLE_ADS','EMAIL','WHATSAPP'];

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

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize={size * 0.22} fontWeight="bold" fill={color}>
        {score}
      </text>
    </svg>
  );
}

export default function ClientPortal() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [downloading, setDownloading] = useState(false);
  const [msgBody, setMsgBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['portal-summary'],
    queryFn: () => api.get<{ data: PortalSummary }>('/client-portal/summary'),
    staleTime: 60_000,
  });

  const d = data?.data;
  const clientId = d?.client?.id;

  const { data: actionItemsData } = useQuery({
    queryKey: ['portal-action-items', clientId],
    queryFn: () => api.get<{ data: ActionItem[] }>(`/clients/${clientId}/action-items`),
    enabled: !!clientId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const actionItems = (actionItemsData?.data ?? []).filter(i => i.status === 'PENDING' || i.status === 'IN_PROGRESS');

  const { data: messagesData } = useQuery({
    queryKey: ['portal-messages', clientId],
    queryFn: () => api.get<{ data: ClientMessage[] }>(`/clients/${clientId}/messages`),
    enabled: !!clientId,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
  const messages = messagesData?.data ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!clientId) return;
    api.put(`/clients/${clientId}/messages/read`, {}).catch(() => {});
  }, [clientId]);

  const sendMessage = async () => {
    if (!msgBody.trim() || !clientId) return;
    setSending(true);
    try {
      await api.post(`/clients/${clientId}/messages`, { body: msgBody.trim() });
      setMsgBody('');
      qc.invalidateQueries({ queryKey: ['portal-messages', clientId] });
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const now = new Date();
  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const downloadReport = async () => {
    setDownloading(true);
    try {
      const response = await fetch('/api/client-portal/report', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-performance-report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!d?.client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Zap size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700">No client assigned yet</h2>
        <p className="text-gray-500 mt-2 max-w-sm">Your account hasn't been linked to a client yet. Contact your agency to set this up.</p>
      </div>
    );
  }

  const { client, agency, optimizations, lastAudit, recentPosts, topActions, avgScore } = d;
  const activePlatforms = optimizations.filter(o => o.score > 0);
  const optMap: Record<string, { score: number; checks: number }> = {};
  for (const o of optimizations) optMap[o.platform] = { score: o.score, checks: o._count.checks };

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{ background: `linear-gradient(135deg, ${agency.primaryColor} 0%, ${agency.accentColor} 100%)` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium opacity-75 mb-1">{agency.name}</p>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <p className="text-sm opacity-80 mt-1">{client.domain}{client.industry ? ` · ${client.industry}` : ''}</p>
            {agency.reportTagline && (
              <p className="text-xs opacity-65 mt-3 italic">{agency.reportTagline}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-3">
            {avgScore > 0 && <ScoreRing score={avgScore} size={72} />}
            <button
              onClick={downloadReport}
              disabled={downloading}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-xl text-sm font-medium text-white backdrop-blur-sm"
            >
              {downloading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              {downloading ? 'Generating…' : 'Download My Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Platform Score', value: avgScore || '—', icon: TrendingUp, color: 'bg-primary-50 text-primary-700' },
          { label: 'Platforms Active', value: activePlatforms.length, icon: Zap, color: 'bg-blue-50 text-blue-600' },
          { label: 'Approved Posts', value: recentPosts.length, icon: FileText, color: 'bg-violet-50 text-violet-600' },
          { label: 'Action Items', value: topActions.length, icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform scores */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Platform Scores</h2>
          <div className="space-y-3">
            {PLATFORM_ORDER.map(platform => {
              const data = optMap[platform];
              const score = data?.score ?? 0;
              const meta = PLATFORM_META[platform];
              if (!data && score === 0) return null;
              return (
                <div key={platform} className="flex items-center gap-3">
                  <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-lg w-24 text-center flex-shrink-0 ${meta.bg}`}>
                    {meta.label}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${scoreBarColor(score)}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold w-8 text-right flex-shrink-0 ${scoreColorClass(score)}`}>{score}</span>
                </div>
              );
            }).filter(Boolean)}
            {activePlatforms.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No platform data yet — your agency is setting this up.</p>
            )}
          </div>
        </div>

        {/* Right column: Audit + Actions */}
        <div className="space-y-4">
          {/* Last audit */}
          {lastAudit && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" />
                Latest Audit
              </h2>
              <div className="flex items-center gap-4">
                {lastAudit.overallScore !== null && (
                  <ScoreRing score={lastAudit.overallScore} size={56} />
                )}
                <div>
                  <p className="font-semibold text-gray-900">{lastAudit.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(lastAudit.createdAt).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${
                    lastAudit.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {lastAudit.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Priority action items */}
          {topActions.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                Priority Actions
                <span className="text-xs font-normal text-gray-400">{monthName}</span>
              </h2>
              <div className="space-y-2">
                {topActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm">
                    <div className={`mt-0.5 flex-shrink-0 ${action.status === 'FAIL' ? 'text-red-500' : 'text-yellow-500'}`}>
                      {action.status === 'FAIL' ? <XCircle size={14} /> : <AlertTriangle size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 text-xs font-medium truncate">{action.name}</p>
                      <p className="text-gray-400 text-xs">{PLATFORM_META[action.platform]?.label ?? action.platform}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Required */}
      {actionItems.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-amber-500" />
            <h2 className="font-semibold text-gray-800">Action Required</h2>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{actionItems.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {actionItems.map(item => {
              const isOverdue = !!(item.dueDate && new Date(item.dueDate) < now);
              return (
                <div key={item.id} className={`flex items-start gap-3 px-6 py-3.5 ${isOverdue ? 'bg-red-50/40' : ''}`}>
                  <div className={`mt-0.5 flex-shrink-0 ${item.status === 'IN_PROGRESS' ? 'text-blue-500' : 'text-amber-500'}`}>
                    <CheckCircle2 size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{item.title}</p>
                    {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                    {item.dueDate && (
                      <span className={`flex items-center gap-1 text-xs mt-1 ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                        <Calendar size={10} />
                        Due {new Date(item.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {isOverdue && ' · Overdue'}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Messages */}
      {clientId && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <MessageSquare size={16} className="text-primary-600" />
            <h2 className="font-semibold text-gray-800">Messages</h2>
            <span className="text-xs text-gray-400 ml-auto">Refreshes every 30 s</span>
          </div>
          <div className="h-72 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300">
                <MessageSquare size={28} className="mb-2" />
                <p className="text-sm">No messages yet.</p>
              </div>
            ) : (
              messages.map(msg => {
                const isOurs = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isOurs ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isOurs ? 'bg-primary-800 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'}`}>
                      {!isOurs && <p className="text-xs font-semibold mb-0.5 text-gray-400">{msg.senderName}</p>}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                      <p className={`text-[10px] mt-1 ${isOurs ? 'text-primary-200' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-gray-200 p-3 bg-white flex gap-2">
            <textarea
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-300"
              rows={2}
              placeholder="Type a message… (Enter to send)"
              value={msgBody}
              onChange={e => setMsgBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !msgBody.trim()}
              className="px-4 py-2 rounded-xl text-sm font-medium self-end flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              style={{ background: agency.primaryColor, color: '#fff' }}
            >
              <Send size={13} /> {sending ? '…' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* Recent approved posts */}
      {recentPosts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Approved Content</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentPosts.map(post => (
              <div key={post.id} className="flex items-start gap-3 px-6 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    {post.platforms.slice(0, 3).map(p => (
                      <span key={p} className={`text-xs text-white px-1.5 py-0.5 rounded font-medium ${PLATFORM_META[p]?.bg ?? 'bg-gray-500'}`}>
                        {PLATFORM_META[p]?.label ?? p}
                      </span>
                    ))}
                    {post.aiGenerated && <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">AI</span>}
                  </div>
                  <p className="text-sm text-gray-800 truncate">{post.caption}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    {post.scheduledAt && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(post.scheduledAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span>{new Date(post.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${
                  post.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                  post.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {post.status.charAt(0) + post.status.slice(1).toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
