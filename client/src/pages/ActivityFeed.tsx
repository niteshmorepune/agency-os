import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Send, CheckCircle, XCircle, Receipt, FileText, Filter } from 'lucide-react';
import { api } from '../api/client';

interface ActivityLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { name: string; avatarUrl: string | null; role: string };
}

const ACTION_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  POST_APPROVED:    { label: 'approved a post',           icon: <CheckCircle size={13} />, color: 'text-green-600',  bg: 'bg-green-50' },
  POST_REJECTED:    { label: 'rejected a post',           icon: <XCircle size={13} />,     color: 'text-red-600',    bg: 'bg-red-50' },
  INVOICE_CREATED:  { label: 'created an invoice',        icon: <Receipt size={13} />,     color: 'text-blue-600',   bg: 'bg-blue-50' },
  INVOICE_SENT:     { label: 'sent an invoice',           icon: <Send size={13} />,        color: 'text-purple-600', bg: 'bg-purple-50' },
  INVOICE_PAID:     { label: 'marked invoice as paid',    icon: <CheckCircle size={13} />, color: 'text-green-600',  bg: 'bg-green-50' },
};

const DEFAULT_META = { label: 'performed an action', icon: <FileText size={13} />, color: 'text-gray-600', bg: 'bg-gray-50' };

const ACTION_FILTERS = [
  { key: '', label: 'All activity' },
  { key: 'POST_APPROVED', label: 'Post approvals' },
  { key: 'POST_REJECTED', label: 'Post rejections' },
  { key: 'INVOICE_CREATED', label: 'Invoices created' },
  { key: 'INVOICE_SENT', label: 'Invoices sent' },
  { key: 'INVOICE_PAID', label: 'Payments received' },
];

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function groupByDate(logs: ActivityLog[]): { date: string; items: ActivityLog[] }[] {
  const map = new Map<string, ActivityLog[]>();
  for (const log of logs) {
    const d = new Date(log.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = d.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(log);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

export default function ActivityFeed() {
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['activity', actionFilter],
    queryFn: () => {
      const p = new URLSearchParams({ limit: '200' });
      if (actionFilter) p.set('action', actionFilter);
      return api.get<{ data: ActivityLog[] }>(`/activity?${p}`);
    },
    refetchInterval: 60_000,
  });

  const logs = data?.data ?? [];
  const groups = groupByDate(logs);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-500 mt-1 text-sm">A chronological record of all team actions.</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-gray-400" />
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
          {ACTION_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActionFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${actionFilter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="card p-16 text-center">
          <Activity size={40} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No activity yet</h3>
          <p className="text-gray-500 mt-1 text-sm">Actions like approving posts and sending invoices will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.date}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{group.date}</p>
              <div className="space-y-1">
                {group.items.map(log => {
                  const meta = ACTION_META[log.action] ?? DEFAULT_META;
                  const md = log.metadata ?? {};
                  let detail = '';
                  if (log.action.startsWith('INVOICE') && md.invoiceNumber) {
                    detail = `${md.invoiceNumber}${md.clientName ? ` · ${md.clientName}` : ''}`;
                  } else if (log.action.startsWith('POST') && md.caption) {
                    detail = String(md.caption).slice(0, 60) + (String(md.caption).length > 60 ? '…' : '');
                  }

                  return (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                      {/* User avatar */}
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-primary-700 text-xs font-bold">
                        {log.user.name[0]?.toUpperCase()}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-gray-800">{log.user.name}</span>
                          <span className={`flex items-center gap-1 text-xs font-medium ${meta.color}`}>
                            {meta.icon} {meta.label}
                          </span>
                        </div>
                        {detail && <p className="text-xs text-gray-400 mt-0.5 truncate">{detail}</p>}
                      </div>

                      {/* Time */}
                      <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">{timeAgo(log.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
