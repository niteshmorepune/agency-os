import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronRight, Receipt, Clock, CheckCircle, Send, AlertCircle, FileText } from 'lucide-react';
import { api } from '../api/client';

interface Invoice {
  id: string;
  invoiceNumber: string;
  title: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
  total: number;
  currency: string;
  dueDate: string | null;
  createdAt: string;
  client: { name: string };
}

interface ClientBasic { id: string; name: string; status: string }

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  DRAFT:   { label: 'Draft',   cls: 'bg-gray-100 text-gray-600',   icon: <FileText size={11} /> },
  SENT:    { label: 'Sent',    cls: 'bg-blue-100 text-blue-700',   icon: <Send size={11} /> },
  PAID:    { label: 'Paid',    cls: 'bg-green-100 text-green-700', icon: <CheckCircle size={11} /> },
  OVERDUE: { label: 'Overdue', cls: 'bg-red-100 text-red-700',     icon: <AlertCircle size={11} /> },
};

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'SENT', label: 'Sent' },
  { key: 'PAID', label: 'Paid' },
  { key: 'OVERDUE', label: 'Overdue' },
];

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export default function Invoices() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ data: ClientBasic[] }>('/clients'),
    staleTime: 60_000,
  });
  const clients = (clientsData?.data ?? []).filter(c => c.status === 'ACTIVE');

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, clientFilter],
    queryFn: () => {
      const p = new URLSearchParams({ limit: '100' });
      if (statusFilter) p.set('status', statusFilter);
      if (clientFilter) p.set('clientId', clientFilter);
      return api.get<{ data: Invoice[]; pagination: { total: number } }>(`/invoices?${p}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice deleted'); },
    onError: () => toast.error('Cannot delete — only draft invoices can be removed'),
  });

  const invoices = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;

  // Aggregate stats
  const paid = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.total, 0);
  const outstanding = invoices.filter(i => ['SENT', 'OVERDUE'].includes(i.status)).reduce((s, i) => s + i.total, 0);
  const overdue = invoices.filter(i => i.status === 'OVERDUE').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 mt-1 text-sm">Track and manage client billing.</p>
        </div>
        <Link to="/invoices/new" className="btn-primary text-sm flex items-center gap-2">
          <Plus size={16} /> New Invoice
        </Link>
      </div>

      {/* Summary cards */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Collected</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(paid, 'INR')}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Outstanding</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(outstanding, 'INR')}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Overdue</p>
            <p className={`text-xl font-bold ${overdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>{overdue}</p>
          </div>
        </div>
      )}

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
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {total > 0 && <span className="text-xs text-gray-400">{total} invoice{total !== 1 ? 's' : ''}</span>}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : invoices.length === 0 ? (
        <div className="card p-16 text-center">
          <Receipt size={40} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No invoices yet</h3>
          <p className="text-gray-500 mt-1 text-sm">Create your first invoice to start billing clients.</p>
          <Link to="/invoices/new" className="btn-primary text-sm mt-4 inline-flex items-center gap-2">
            <Plus size={16} /> New Invoice
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map(inv => {
            const meta = STATUS_META[inv.status];
            const isOverdue = inv.dueDate && inv.status === 'SENT' && new Date(inv.dueDate) < new Date();
            return (
              <div key={inv.id} className="card p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-gray-800">{inv.invoiceNumber}</span>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${meta.cls}`}>
                      {meta.icon} {meta.label}
                    </span>
                    {isOverdue && <span className="text-xs text-red-500 font-medium">Past due</span>}
                  </div>
                  <p className="text-sm text-gray-600 truncate">{inv.title} · {inv.client.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    {inv.dueDate && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        Due {new Date(inv.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span>{new Date(inv.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-gray-900">{formatCurrency(inv.total, inv.currency)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link to={`/invoices/${inv.id}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors">
                    <ChevronRight size={16} />
                  </Link>
                  {inv.status === 'DRAFT' && (
                    <button
                      onClick={() => { if (confirm('Delete this invoice?')) deleteMutation.mutate(inv.id); }}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
