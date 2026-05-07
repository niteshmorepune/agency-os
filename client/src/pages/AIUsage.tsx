import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Zap, DollarSign, Hash, Database, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { api } from '../api/client';

interface UsageLog {
  id: string;
  toolId: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  cached: boolean;
  createdAt: string;
  clientId: string | null;
  user: { name: string };
}

interface UsageTotals {
  _sum: { inputTokens: number | null; outputTokens: number | null; costUsd: number | null };
  _count: number;
}

interface UsageResponse {
  logs: UsageLog[];
  totals: UsageTotals;
}

const TOOL_LABELS: Record<string, string> = {
  caption: 'Caption',
  hashtag: 'Hashtags',
  bio: 'Bio',
  subject_line: 'Subject Line',
  ad_headlines: 'Ad Copy',
  thread: 'Thread',
  email_body: 'Email',
  review_reply: 'Review Reply',
  repurpose: 'Repurpose',
  persona: 'Persona',
  competitor: 'Competitor',
  audit_suggest: 'Audit AI',
  rewrite: 'Rewrite',
  ad: 'Ad',
  keyword: 'Keyword',
  hook: 'Hook',
  script: 'Script',
  post_ideas: 'Post Ideas',
};

const BAR_COLORS = [
  '#1a472a', '#e1306c', '#0a66c2', '#34a853', '#ff0000',
  '#fbbc05', '#7c3aed', '#e60023', '#1da1f2', '#25d366',
  '#ea580c', '#0891b2', '#be185d', '#4f46e5', '#059669',
];

function getMonthRange(monthOffset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59);
  return { from: start.toISOString(), to: end.toISOString() };
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AIUsage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const { from, to } = getMonthRange(monthOffset);

  const { data, isLoading } = useQuery({
    queryKey: ['ai-usage', from, to],
    queryFn: () => api.get<{ data: UsageResponse }>(`/ai/usage?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  });

  const logs = data?.data?.logs ?? [];
  const totals = data?.data?.totals;

  const totalCost = totals?._sum?.costUsd ?? 0;
  const totalTokens = (totals?._sum?.inputTokens ?? 0) + (totals?._sum?.outputTokens ?? 0);
  const totalCalls = totals?._count ?? 0;
  const cachedCount = logs.filter(l => l.cached).length;
  const cacheRate = totalCalls > 0 ? Math.round((cachedCount / totalCalls) * 100) : 0;

  // Aggregate cost per tool for bar chart
  const toolCosts: Record<string, number> = {};
  for (const log of logs) {
    toolCosts[log.toolId] = (toolCosts[log.toolId] ?? 0) + log.costUsd;
  }
  const chartData = Object.entries(toolCosts)
    .sort((a, b) => b[1] - a[1])
    .map(([toolId, cost]) => ({ toolId, name: TOOL_LABELS[toolId] ?? toolId, cost: Number(cost.toFixed(4)) }));

  const monthLabel = new Date(from).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to="/ai-studio" className="mt-1 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 flex-shrink-0">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/ai-studio" className="hover:text-primary-600">AI Studio</Link>
            <span>/</span>
            <span>Usage Dashboard</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={22} className="text-primary-700" />
              AI Usage
            </h1>
            {/* Month nav */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setMonthOffset(o => o - 1)}
                className="px-3 py-1 text-sm rounded-lg hover:bg-white transition-colors text-gray-600"
              >
                ‹
              </button>
              <span className="px-3 text-sm font-medium text-gray-700 min-w-[120px] text-center">{monthLabel}</span>
              <button
                onClick={() => setMonthOffset(o => Math.min(0, o + 1))}
                disabled={monthOffset === 0}
                className="px-3 py-1 text-sm rounded-lg hover:bg-white transition-colors text-gray-600 disabled:opacity-30"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<DollarSign size={18} className="text-primary-700" />}
            label="Total Cost"
            value={`$${totalCost.toFixed(4)}`}
            sub={`≈ ₹${(totalCost * 84).toFixed(2)}`}
          />
          <StatCard
            icon={<Zap size={18} className="text-primary-700" />}
            label="Total Calls"
            value={String(totalCalls)}
            sub={`${cachedCount} cached`}
          />
          <StatCard
            icon={<Hash size={18} className="text-primary-700" />}
            label="Total Tokens"
            value={totalTokens.toLocaleString('en-IN')}
            sub={`${(totals?._sum?.inputTokens ?? 0).toLocaleString('en-IN')} in · ${(totals?._sum?.outputTokens ?? 0).toLocaleString('en-IN')} out`}
          />
          <StatCard
            icon={<Database size={18} className="text-primary-700" />}
            label="Cache Hit Rate"
            value={`${cacheRate}%`}
            sub={`${cachedCount} / ${totalCalls} requests`}
          />
        </div>
      )}

      {/* Cost by tool chart */}
      {chartData.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Cost by Tool (USD)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(val: number) => [`$${val.toFixed(4)}`, 'Cost']}
              />
              <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent logs table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Recent Generations</h2>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Zap size={36} className="mx-auto mb-3 text-gray-300" />
            <p>No AI usage recorded for {monthLabel}.</p>
            <Link to="/ai-studio" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">Open AI Studio</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">Tool</th>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-right font-medium">Tokens</th>
                  <th className="px-4 py-3 text-right font-medium">Cost</th>
                  <th className="px-4 py-3 text-center font-medium">Cache</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.slice(0, 50).map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{TOOL_LABELS[log.toolId] ?? log.toolId}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{log.user.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {(log.inputTokens + log.outputTokens).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {log.cached ? (
                        <span className="text-green-600 font-medium">$0.0000</span>
                      ) : (
                        <span className="text-gray-700">${log.costUsd.toFixed(4)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.cached ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          <Database size={10} /> Hit
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(log.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
