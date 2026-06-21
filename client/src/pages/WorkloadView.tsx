import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, AlertCircle, Clock, Receipt, ChevronRight, Briefcase } from 'lucide-react';
import { api } from '../api/client';

interface ClientWorkload {
  id: string;
  name: string;
  status: string;
  pendingApprovals: number;
  openActionItems: number;
  overdueInvoices: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  clients: ClientWorkload[];
  totals: { pendingApprovals: number; openActionItems: number; overdueInvoices: number };
}

function heatColor(n: number) {
  if (n === 0) return 'text-gray-400';
  if (n <= 2) return 'text-yellow-600';
  return 'text-red-600';
}

function heatBg(n: number) {
  if (n === 0) return 'bg-gray-100 text-gray-500';
  if (n <= 2) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    OWNER: 'bg-purple-100 text-purple-700',
    ACCOUNT_MANAGER: 'bg-blue-100 text-blue-700',
    CONTENT_CREATOR: 'bg-pink-100 text-pink-700',
    SEO_ANALYST: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {role.replace(/_/g, ' ')}
    </span>
  );
}

function WorkloadBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = pct === 0 ? 'bg-gray-200' : pct < 40 ? 'bg-green-400' : pct < 70 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function WorkloadView() {
  const { data, isLoading } = useQuery({
    queryKey: ['workload'],
    queryFn: () => api.get<{ data: TeamMember[] }>('/analytics/workload'),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const members = data?.data ?? [];
  const maxApprovals = Math.max(...members.map(m => m.totals.pendingApprovals), 1);
  const maxItems = Math.max(...members.map(m => m.totals.openActionItems), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Workload</h1>
        <p className="text-gray-500 mt-1 text-sm">Live view of each team member's pending work across all clients.</p>
      </div>

      {/* Summary row */}
      {!isLoading && members.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{members.reduce((s, m) => s + m.totals.pendingApprovals, 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Pending Approvals</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{members.reduce((s, m) => s + m.totals.openActionItems, 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Open Action Items</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{members.reduce((s, m) => s + m.totals.overdueInvoices, 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Overdue Invoices</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="card p-16 text-center">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No team members found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {members.map(member => {
            const totalWork = member.totals.pendingApprovals + member.totals.openActionItems + member.totals.overdueInvoices;
            return (
              <div key={member.id} className="card p-0 overflow-hidden">
                {/* Member header */}
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-primary-800 font-semibold text-sm">{member.name[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{member.name}</p>
                      <RoleBadge role={member.role} />
                    </div>
                    <p className="text-xs text-gray-400">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-center">
                    <div>
                      <p className={`text-lg font-bold ${heatColor(member.totals.pendingApprovals)}`}>{member.totals.pendingApprovals}</p>
                      <p className="text-[10px] text-gray-400">Pending</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${heatColor(member.totals.openActionItems)}`}>{member.totals.openActionItems}</p>
                      <p className="text-[10px] text-gray-400">Actions</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${heatColor(member.totals.overdueInvoices)}`}>{member.totals.overdueInvoices}</p>
                      <p className="text-[10px] text-gray-400">Overdue</p>
                    </div>
                  </div>
                </div>

                {/* Workload bars */}
                <div className="px-5 py-2 border-b border-gray-100 grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>Approvals</span><span>{member.totals.pendingApprovals}/{maxApprovals}</span>
                    </div>
                    <WorkloadBar value={member.totals.pendingApprovals} max={maxApprovals} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>Action Items</span><span>{member.totals.openActionItems}/{maxItems}</span>
                    </div>
                    <WorkloadBar value={member.totals.openActionItems} max={maxItems} />
                  </div>
                </div>

                {/* Client breakdown */}
                {member.clients.length === 0 ? (
                  <div className="px-5 py-4 text-xs text-gray-400 flex items-center gap-2">
                    <Briefcase size={14} /> No clients assigned yet
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {member.clients.map(client => {
                      const hasWork = client.pendingApprovals + client.openActionItems + client.overdueInvoices > 0;
                      return (
                        <div key={client.id} className={`px-5 py-3 flex items-center gap-3 ${!hasWork ? 'opacity-60' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-800 font-medium truncate">{client.name}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${client.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {client.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {client.pendingApprovals > 0 && (
                              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${heatBg(client.pendingApprovals)}`}>
                                <Clock size={10} /> {client.pendingApprovals}
                              </span>
                            )}
                            {client.openActionItems > 0 && (
                              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${heatBg(client.openActionItems)}`}>
                                <AlertCircle size={10} /> {client.openActionItems}
                              </span>
                            )}
                            {client.overdueInvoices > 0 && (
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                                <Receipt size={10} /> {client.overdueInvoices}
                              </span>
                            )}
                            {!hasWork && <span className="text-xs text-gray-300">All clear</span>}
                            <Link to={`/clients/${client.id}`} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                              <ChevronRight size={14} />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {totalWork === 0 && member.clients.length > 0 && (
                  <div className="px-5 py-2 bg-green-50 border-t border-green-100">
                    <p className="text-xs text-green-700 font-medium">All clear — no pending work</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">Refreshes every 2 minutes · Legend: <span className="text-yellow-600">1-2</span> = moderate · <span className="text-red-600">3+</span> = high</p>
    </div>
  );
}
