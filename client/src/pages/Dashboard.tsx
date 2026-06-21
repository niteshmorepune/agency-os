import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Zap, Bot, BarChart3, TrendingUp, AlertTriangle, FileText,
  CheckCircle, XCircle, MessageSquare, ThumbsUp, Calendar,
  ChevronRight, Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import { Link } from 'react-router-dom';
import { Role } from '@agencyos/shared';
import { toast } from 'sonner';

const PLATFORM_BG: Record<string, string> = {
  LINKEDIN: 'bg-blue-600', INSTAGRAM: 'bg-pink-500', FACEBOOK: 'bg-blue-500',
  GBP: 'bg-green-600', YOUTUBE: 'bg-red-600', TWITTER: 'bg-sky-500',
  TIKTOK: 'bg-gray-800', PINTEREST: 'bg-red-500', GOOGLE_ADS: 'bg-yellow-500',
  EMAIL: 'bg-purple-600', WHATSAPP: 'bg-green-500',
};
const PLATFORM_LABELS: Record<string, string> = {
  LINKEDIN: 'LI', INSTAGRAM: 'IG', FACEBOOK: 'FB', GBP: 'GBP',
  YOUTUBE: 'YT', TWITTER: 'TW', TIKTOK: 'TT', PINTEREST: 'PIN',
  GOOGLE_ADS: 'GAds', EMAIL: 'Email', WHATSAPP: 'WA',
};

interface TodayData {
  pendingApprovals: {
    id: string; caption: string; platforms: string[];
    scheduledAt: string | null; aiGenerated: boolean;
    clientReviewStatus: string | null; createdAt: string;
    client: { id: string; name: string };
  }[];
  overdueItems: {
    id: string; title: string; dueDate: string; status: string;
    clientId: string; client: { name: string };
  }[];
  todayScheduled: {
    id: string; caption: string; platforms: string[];
    scheduledAt: string | null; approvalStatus: string;
    client: { id: string; name: string };
  }[];
  clientFeedback: {
    id: string; caption: string; platforms: string[];
    clientFeedback: string | null; updatedAt: string;
    client: { id: string; name: string };
  }[];
  unreadMessages: { clientId: string; clientName: string; count: number }[];
}

interface AnalyticsSummary {
  clients: { total: number; active: number };
  posts: { total: number; thisMonth: number };
  audits: { total: number; inProgress: number };
  optimization: { overallAvg: number };
  aiUsage: { totalCost: number; totalCalls: number };
}

function PlatformChips({ platforms }: { platforms: string[] }) {
  return (
    <span className="flex items-center gap-1 flex-wrap">
      {platforms.slice(0, 3).map(p => (
        <span key={p} className={`text-xs text-white px-1.5 py-0.5 rounded font-medium ${PLATFORM_BG[p] ?? 'bg-gray-500'}`}>
          {PLATFORM_LABELS[p] ?? p}
        </span>
      ))}
      {platforms.length > 3 && <span className="text-xs text-gray-400">+{platforms.length - 3}</span>}
    </span>
  );
}

function SectionHeader({ title, count, countColor = 'bg-gray-100 text-gray-600', link, linkLabel = 'View all' }: {
  title: string; count?: number; countColor?: string; link?: string; linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {count !== undefined && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${countColor}`}>{count}</span>
        )}
      </div>
      {link && <Link to={link} className="text-xs text-primary-600 hover:underline">{linkLabel} →</Link>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['dashboard-today'],
    queryFn: () => api.get<{ data: TodayData }>('/analytics/today'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: summaryData } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => api.get<{ data: AnalyticsSummary }>('/analytics/summary'),
    staleTime: 60_000,
  });

  const today = todayData?.data;
  const summary = summaryData?.data;

  const canApprove = user?.role === Role.OWNER || user?.role === Role.ACCOUNT_MANAGER;

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/posts/${id}/approve`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dashboard-today'] }); toast.success('Post approved'); },
    onError: () => toast.error('Failed to approve post'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/posts/${id}/reject`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dashboard-today'] }); toast.success('Post sent back for revision'); },
    onError: () => toast.error('Failed to reject post'),
  });

  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const totalUnread = (today?.unreadMessages ?? []).reduce((s, m) => s + m.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-gray-400 mt-0.5 text-sm">{dateLabel}</p>
        </div>
      </div>

      {/* Quick stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Needs Approval',
            value: today?.pendingApprovals.length ?? 0,
            icon: FileText,
            color: (today?.pendingApprovals.length ?? 0) > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-100 text-gray-500',
          },
          {
            label: 'Overdue Items',
            value: today?.overdueItems.length ?? 0,
            icon: AlertTriangle,
            color: (today?.overdueItems.length ?? 0) > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-100 text-gray-500',
          },
          {
            label: "Today's Posts",
            value: today?.todayScheduled.length ?? 0,
            icon: Calendar,
            color: (today?.todayScheduled.length ?? 0) > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-100 text-gray-500',
          },
          {
            label: 'Unread Messages',
            value: totalUnread,
            icon: MessageSquare,
            color: totalUnread > 0 ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-gray-50 border-gray-100 text-gray-500',
          },
        ].map(chip => {
          const Icon = chip.icon;
          return (
            <div key={chip.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${chip.color}`}>
              <Icon size={16} className="flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg font-bold leading-none">{chip.value}</p>
                <p className="text-xs mt-0.5 opacity-80 truncate">{chip.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pending Approvals */}
        <div className="card p-5">
          <SectionHeader
            title="Awaiting Approval"
            count={today?.pendingApprovals.length}
            countColor={(today?.pendingApprovals.length ?? 0) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}
            link="/content"
            linkLabel="All posts"
          />
          {todayLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : (today?.pendingApprovals.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-gray-300">
              <CheckCircle size={32} className="mx-auto mb-2" />
              <p className="text-sm text-gray-400">All caught up — no pending posts.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {today!.pendingApprovals.map(post => (
                <div key={post.id} className="border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                      <PlatformChips platforms={post.platforms} />
                      {post.clientReviewStatus === 'CLIENT_APPROVED' && (
                        <span className="flex items-center gap-0.5 text-xs bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded font-medium">
                          <ThumbsUp size={9} /> Client OK
                        </span>
                      )}
                      {post.aiGenerated && (
                        <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">AI</span>
                      )}
                    </div>
                    <Link to={`/content/${post.id}/edit`} className="text-gray-300 hover:text-primary-600 flex-shrink-0">
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                  <p className="text-xs text-gray-600 truncate mb-1">{post.caption}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400">{post.client.name}</span>
                    {canApprove && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => approveMutation.mutate(post.id)}
                          disabled={approveMutation.isPending}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          <CheckCircle size={11} /> Approve
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(post.id)}
                          disabled={rejectMutation.isPending}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          <XCircle size={11} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column — Today's schedule + Unread messages */}
        <div className="space-y-5">
          {/* Today's schedule */}
          <div className="card p-5">
            <SectionHeader
              title="Going Live Today"
              count={today?.todayScheduled.length}
              countColor={(today?.todayScheduled.length ?? 0) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}
              link="/content/calendar"
              linkLabel="Calendar"
            />
            {todayLoading ? (
              <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ) : (today?.todayScheduled.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No posts scheduled for today.</p>
            ) : (
              <div className="space-y-2">
                {today!.todayScheduled.map(post => (
                  <Link key={post.id} to={`/content/${post.id}/edit`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <PlatformChips platforms={post.platforms} />
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${post.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {post.approvalStatus === 'APPROVED' ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{post.caption}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {post.client.name} · {post.scheduledAt ? new Date(post.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-primary-600 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Unread client messages */}
          {(today?.unreadMessages.length ?? 0) > 0 && (
            <div className="card p-5">
              <SectionHeader
                title="Unread Client Messages"
                count={totalUnread}
                countColor="bg-violet-100 text-violet-700"
              />
              <div className="space-y-2">
                {today!.unreadMessages.map(m => (
                  <Link
                    key={m.clientId}
                    to={`/clients/${m.clientId}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-violet-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageSquare size={13} />
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{m.clientName}</span>
                    </div>
                    <span className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full font-semibold">{m.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Second row — Client Feedback + Overdue Action Items */}
      {((today?.clientFeedback.length ?? 0) > 0 || (today?.overdueItems.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Client feedback (posts needing revision) */}
          {(today?.clientFeedback.length ?? 0) > 0 && (
            <div className="card p-5">
              <SectionHeader
                title="Client Feedback — Needs Revision"
                count={today?.clientFeedback.length}
                countColor="bg-amber-100 text-amber-700"
                link="/content"
                linkLabel="All posts"
              />
              <div className="space-y-2">
                {today!.clientFeedback.map(post => (
                  <Link key={post.id} to={`/content/${post.id}/edit`} className="flex items-start gap-3 p-3 rounded-xl border border-amber-100 hover:border-amber-300 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <PlatformChips platforms={post.platforms} />
                        <span className="text-xs text-gray-400">{post.client.name}</span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{post.caption}</p>
                      {post.clientFeedback && (
                        <p className="text-xs text-amber-700 italic mt-1 truncate">💬 "{post.clientFeedback}"</p>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-amber-600 flex-shrink-0 mt-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Overdue action items */}
          {(today?.overdueItems.length ?? 0) > 0 && (
            <div className="card p-5">
              <SectionHeader
                title="Overdue Action Items"
                count={today?.overdueItems.length}
                countColor="bg-red-100 text-red-700"
              />
              <div className="space-y-2">
                {today!.overdueItems.map(item => (
                  <Link key={item.id} to={`/clients/${item.clientId}`} className="flex items-start gap-3 p-3 rounded-xl border border-red-100 hover:border-red-300 transition-colors group">
                    <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{item.client.name}</span>
                        <span className="text-xs text-red-500 font-medium">
                          Due {new Date(item.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-red-500 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom row — Stats summary + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Agency stats */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">Agency Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Active Clients', value: summary?.clients.active ?? '—', sub: `${summary?.clients.total ?? 0} total`, icon: Users, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' },
              { label: 'Posts This Month', value: summary?.posts.thisMonth ?? '—', sub: `${summary?.posts.total ?? 0} total`, icon: FileText, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
              { label: 'Avg Platform Score', value: summary?.optimization.overallAvg || '—', sub: 'across all clients', icon: Zap, color: 'text-primary-700 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400' },
              { label: 'Audits', value: summary?.audits.total ?? '—', sub: `${summary?.audits.inProgress ?? 0} in progress`, icon: CheckCircle, color: 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' },
            ].map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">{stat.value}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {(summary?.optimization.overallAvg ?? 0) > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-primary-700" />
                <span className="text-xs font-medium text-primary-800">Overall platform score</span>
              </div>
              <span className={`text-lg font-bold ${
                (summary?.optimization.overallAvg ?? 0) >= 80 ? 'text-green-600' :
                (summary?.optimization.overallAvg ?? 0) >= 60 ? 'text-yellow-500' : 'text-red-500'
              }`}>{summary?.optimization.overallAvg}</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'New Post', href: '/content/new', icon: FileText, color: 'bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50' },
              { label: 'AI Studio', href: '/ai-studio', icon: Bot, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50' },
              { label: 'Optimize', href: '/optimize', icon: Zap, color: 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50' },
              { label: 'Analytics', href: '/analytics', icon: BarChart3, color: 'bg-accent-50 text-accent-700 hover:bg-accent-100 dark:bg-accent-900/30 dark:text-accent-300 dark:hover:bg-accent-900/50' },
              { label: 'Add Client', href: '/clients/new', icon: Users, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50' },
              { label: 'Search Visibility', href: '/ai-studio/search-visibility', icon: Sparkles, color: 'bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/50' },
            ].map(action => {
              const Icon = action.icon;
              return (
                <Link key={action.href} to={action.href} className={`flex items-center gap-2.5 p-3 rounded-xl transition-colors font-medium text-sm ${action.color}`}>
                  <Icon size={16} />
                  {action.label}
                </Link>
              );
            })}
          </div>

          {user?.role === Role.OWNER && (
            <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/40">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Setup Reminder</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Configure API keys to unlock all AI features.</p>
                  <Link to="/settings" state={{ tab: 'api-keys' }} className="text-xs text-amber-700 dark:text-amber-400 underline mt-1 inline-block">Go to Settings →</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
