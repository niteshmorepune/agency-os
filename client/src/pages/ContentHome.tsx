import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PenSquare, Calendar, Lightbulb, Trash2, CheckCircle, XCircle, Clock, FileText, ChevronRight, Image, ThumbsUp, MessageCircle, BarChart2, Radio, CheckSquare, Square, Check } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';

interface PostDraft {
  id: string;
  clientId: string;
  platforms: string[];
  caption: string;
  hashtags: string[];
  scheduledAt: string | null;
  publishedAt: string | null;
  status: string;
  approvalStatus: string;
  clientReviewStatus: string | null;
  clientFeedback: string | null;
  aiGenerated: boolean;
  createdAt: string;
  createdBy: { name: string };
}

interface ClientBasic {
  id: string;
  name: string;
  status: string;
}

const PLATFORM_META: Record<string, { label: string; bg: string }> = {
  LINKEDIN:   { label: 'LinkedIn',    bg: 'bg-blue-600' },
  INSTAGRAM:  { label: 'Instagram',  bg: 'bg-pink-500' },
  FACEBOOK:   { label: 'Facebook',   bg: 'bg-blue-500' },
  GBP:        { label: 'Google Biz', bg: 'bg-green-600' },
  YOUTUBE:    { label: 'YouTube',    bg: 'bg-red-600' },
  TWITTER:    { label: 'X / Twitter',bg: 'bg-sky-500' },
  TIKTOK:     { label: 'TikTok',     bg: 'bg-gray-800' },
  PINTEREST:  { label: 'Pinterest',  bg: 'bg-red-500' },
  GOOGLE_ADS: { label: 'Google Ads', bg: 'bg-yellow-500' },
  EMAIL:      { label: 'Email',      bg: 'bg-purple-600' },
  WHATSAPP:   { label: 'WhatsApp',   bg: 'bg-green-500' },
};

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'ARCHIVED', label: 'Archived' },
];

const APPROVAL_META: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  PENDING:  { label: 'Pending',  cls: 'bg-yellow-100 text-yellow-700', icon: <Clock size={11} /> },
  APPROVED: { label: 'Approved', cls: 'bg-green-100 text-green-700',  icon: <CheckCircle size={11} /> },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-700',      icon: <XCircle size={11} /> },
};

export default function ContentHome() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canApprove = user?.role === 'OWNER' || user?.role === 'ACCOUNT_MANAGER';
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ data: ClientBasic[] }>('/clients'),
    staleTime: 60_000,
  });
  const clients = (clientsData?.data ?? []).filter(c => c.status === 'ACTIVE');

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['posts', statusFilter, clientFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      if (clientFilter) params.set('clientId', clientFilter);
      return api.get<{ data: PostDraft[]; pagination: { total: number } }>(`/posts?${params}`);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/posts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/posts/bulk-approve', { ids }),
    onSuccess: (_, ids) => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      setSelected(new Set());
      toast.success(`${ids.length} post${ids.length !== 1 ? 's' : ''} approved`);
    },
    onError: () => toast.error('Bulk approve failed'),
  });

  const bulkRejectMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/posts/bulk-reject', { ids }),
    onSuccess: (_, ids) => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      setSelected(new Set());
      toast.success(`${ids.length} post${ids.length !== 1 ? 's' : ''} rejected`);
    },
    onError: () => toast.error('Bulk reject failed'),
  });

  const posts = postsData?.data ?? [];
  const total = postsData?.pagination?.total ?? 0;

  const pendingPosts = posts.filter(p => p.approvalStatus === 'PENDING');
  const allPendingSelected = pendingPosts.length > 0 && pendingPosts.every(p => selected.has(p.id));

  function togglePost(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allPendingSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingPosts.map(p => p.id)));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Studio</h1>
          <p className="text-gray-500 mt-1 text-sm">Compose, schedule, and manage posts for all clients.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/content/calendar" className="btn-secondary text-sm flex items-center gap-2">
            <Calendar size={16} /> Calendar
          </Link>
          <Link to="/content/ideas" className="btn-secondary text-sm flex items-center gap-2">
            <Lightbulb size={16} /> Ideas
          </Link>
          <Link to="/content/media" className="btn-secondary text-sm flex items-center gap-2">
            <Image size={16} /> Media
          </Link>
          <Link to="/content/performance" className="btn-secondary text-sm flex items-center gap-2">
            <BarChart2 size={16} /> Performance
          </Link>
          <Link to="/content/new" className="btn-primary text-sm flex items-center gap-2">
            <PenSquare size={16} /> New Post
          </Link>
        </div>
      </div>

      {/* Filters */}
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
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {total > 0 && (
          <span className="text-xs text-gray-400 ml-1">{total} post{total !== 1 ? 's' : ''}</span>
        )}

        {/* Bulk select all pending */}
        {canApprove && pendingPosts.length > 0 && (
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 ml-auto transition-colors"
          >
            {allPendingSelected ? <CheckSquare size={14} className="text-primary-700" /> : <Square size={14} />}
            Select all pending ({pendingPosts.length})
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-primary-800">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => bulkApproveMutation.mutate([...selected])}
              disabled={bulkApproveMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Check size={14} /> Approve All
            </button>
            <button
              onClick={() => bulkRejectMutation.mutate([...selected])}
              disabled={bulkRejectMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <XCircle size={14} /> Reject All
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Posts list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="card p-16 text-center">
          <FileText size={40} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No posts yet</h3>
          <p className="text-gray-500 mt-1 text-sm">Create your first post or generate ideas with AI.</p>
          <div className="flex items-center gap-3 justify-center mt-4">
            <Link to="/content/new" className="btn-primary text-sm">New Post</Link>
            <Link to="/content/ideas" className="btn-secondary text-sm">Ideas Engine</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(post => {
            const approval = APPROVAL_META[post.approvalStatus];
            const isSelected = selected.has(post.id);
            const isPending = post.approvalStatus === 'PENDING';
            return (
              <div key={post.id} className={`card p-4 flex items-start gap-4 hover:shadow-sm transition-shadow ${isSelected ? 'ring-2 ring-primary-400 ring-offset-1' : ''}`}>
                {canApprove && isPending && (
                  <button
                    onClick={() => togglePost(post.id)}
                    className="mt-1 flex-shrink-0 text-gray-400 hover:text-primary-700 transition-colors"
                  >
                    {isSelected ? <CheckSquare size={16} className="text-primary-700" /> : <Square size={16} />}
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {post.platforms.slice(0, 4).map(p => (
                      <span key={p} className={`text-xs text-white px-2 py-0.5 rounded-full font-medium ${PLATFORM_META[p]?.bg ?? 'bg-gray-500'}`}>
                        {PLATFORM_META[p]?.label ?? p}
                      </span>
                    ))}
                    {post.platforms.length > 4 && (
                      <span className="text-xs text-gray-400">+{post.platforms.length - 4}</span>
                    )}
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${approval.cls}`}>
                      {approval.icon} {approval.label}
                    </span>
                    {post.publishedAt && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                        <Radio size={10} /> Live
                      </span>
                    )}
                    {post.clientReviewStatus === 'CLIENT_APPROVED' && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium border border-green-200">
                        <ThumbsUp size={10} /> Client OK
                      </span>
                    )}
                    {post.clientReviewStatus === 'CHANGES_REQUESTED' && (
                      <span
                        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200 cursor-help"
                        title={post.clientFeedback ?? 'Client requested changes'}
                      >
                        <MessageCircle size={10} /> Client Feedback
                      </span>
                    )}
                    {post.aiGenerated && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">AI</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 truncate">{post.caption}</p>
                  {post.clientFeedback && (
                    <p className="text-xs text-amber-700 mt-0.5 truncate italic">💬 "{post.clientFeedback}"</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>by {post.createdBy.name}</span>
                    {post.scheduledAt && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(post.scheduledAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <span>{new Date(post.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    to={`/content/${post.id}/edit`}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm('Archive this post?')) archiveMutation.mutate(post.id);
                    }}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
