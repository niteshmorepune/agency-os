import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Download, Send, CheckCircle, AlertCircle, ArrowLeft, Save } from 'lucide-react';
import { api } from '../api/client';

interface InvoiceItem { description: string; qty: number; rate: number; amount: number }

interface Invoice {
  id: string;
  invoiceNumber: string;
  title: string;
  clientId: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  total: number;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  client: { name: string; domain: string; contactName: string | null; contactEmail: string | null };
}

interface ClientBasic { id: string; name: string; status: string }

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

const STATUS_STYLE: Record<string, string> = {
  DRAFT:   'bg-gray-100 text-gray-600',
  SENT:    'bg-blue-100 text-blue-700',
  PAID:    'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

function emptyItem(): InvoiceItem { return { description: '', qty: 1, rate: 0, amount: 0 }; }

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [taxRate, setTaxRate] = useState(0);
  const [currency, setCurrency] = useState('INR');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [downloading, setDownloading] = useState(false);

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ data: ClientBasic[] }>('/clients'),
    staleTime: 60_000,
  });
  const clients = (clientsData?.data ?? []).filter(c => c.status === 'ACTIVE');

  const { data: invData, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get<{ data: Invoice }>(`/invoices/${id}`),
    enabled: !isNew,
  });
  const invoice = invData?.data;

  useEffect(() => {
    if (invoice) {
      setClientId(invoice.clientId);
      setTitle(invoice.title);
      setItems(invoice.items);
      setTaxRate(invoice.taxRate);
      setCurrency(invoice.currency);
      setDueDate(invoice.dueDate ? invoice.dueDate.slice(0, 10) : '');
      setNotes(invoice.notes ?? '');
    }
  }, [invoice]);

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  function updateItem(idx: number, field: keyof InvoiceItem, value: string | number) {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'qty' || field === 'rate') {
        updated.amount = Number(updated.qty) * Number(updated.rate);
      }
      return updated;
    }));
  }

  function addItem() { setItems(prev => [...prev, emptyItem()]); }
  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }

  const createMutation = useMutation({
    mutationFn: () => api.post<{ data: Invoice }>('/invoices', {
      clientId, title, items, taxRate, currency,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      notes: notes || null,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created');
      navigate(`/invoices/${res.data.id}`);
    },
    onError: () => toast.error('Failed to create invoice'),
  });

  const updateMutation = useMutation({
    mutationFn: () => api.put<{ data: Invoice }>(`/invoices/${id}`, {
      title, items, taxRate, currency,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      notes: notes || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice updated');
    },
    onError: () => toast.error('Failed to update invoice'),
  });

  const sendMutation = useMutation({
    mutationFn: () => api.post(`/invoices/${id}/send`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice', id] }); qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice marked as sent'); },
  });

  const paidMutation = useMutation({
    mutationFn: () => api.post(`/invoices/${id}/paid`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice', id] }); qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice marked as paid'); },
  });

  const overdueMutation = useMutation({
    mutationFn: () => api.post(`/invoices/${id}/overdue`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice', id] }); qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice marked as overdue'); },
  });

  async function downloadPdf() {
    setDownloading(true);
    try {
      const response = await fetch(`/api/invoices/${id}/pdf`, { credentials: 'include' });
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice?.invoiceNumber ?? 'invoice'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    }
    setDownloading(false);
  }

  const isDraft = isNew || invoice?.status === 'DRAFT';
  const saving = createMutation.isPending || updateMutation.isPending;

  if (!isNew && isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/invoices" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">
              {isNew ? 'New Invoice' : invoice?.invoiceNumber}
            </h1>
            {invoice && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLE[invoice.status]}`}>
                {invoice.status}
              </span>
            )}
          </div>
          {!isNew && invoice && (
            <p className="text-sm text-gray-500 mt-0.5">{invoice.client.name} · Created {new Date(invoice.createdAt).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          )}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isNew && invoice?.status === 'DRAFT' && (
            <button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending} className="btn-secondary text-sm flex items-center gap-2">
              <Send size={14} /> Mark Sent
            </button>
          )}
          {!isNew && (invoice?.status === 'SENT' || invoice?.status === 'OVERDUE') && (
            <button onClick={() => paidMutation.mutate()} disabled={paidMutation.isPending} className="btn-secondary text-sm flex items-center gap-2 text-green-700 hover:bg-green-50">
              <CheckCircle size={14} /> Mark Paid
            </button>
          )}
          {!isNew && invoice?.status === 'SENT' && (
            <button onClick={() => overdueMutation.mutate()} disabled={overdueMutation.isPending} className="btn-secondary text-sm flex items-center gap-2 text-red-600 hover:bg-red-50">
              <AlertCircle size={14} /> Mark Overdue
            </button>
          )}
          {!isNew && (
            <button onClick={downloadPdf} disabled={downloading} className="btn-secondary text-sm flex items-center gap-2">
              <Download size={14} /> {downloading ? 'Generating…' : 'PDF'}
            </button>
          )}
          {isDraft && (
            <button
              onClick={() => isNew ? createMutation.mutate() : updateMutation.mutate()}
              disabled={saving || !clientId || !title || items.length === 0}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Save size={14} /> {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm">Invoice Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Client</label>
                <select
                  className="input w-full"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  disabled={!isDraft}
                >
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Invoice Title</label>
                <input
                  className="input w-full"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Social Media Management – May 2026"
                  disabled={!isDraft}
                />
              </div>
              <div>
                <label className="label">Currency</label>
                <select className="input w-full" value={currency} onChange={e => setCurrency(e.target.value)} disabled={!isDraft}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Due Date</label>
                <input
                  type="date"
                  className="input w-full"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  disabled={!isDraft}
                />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Line Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2 font-medium w-[45%]">Description</th>
                    <th className="text-right pb-2 font-medium w-[12%]">Qty</th>
                    <th className="text-right pb-2 font-medium w-[20%]">Rate</th>
                    <th className="text-right pb-2 font-medium w-[20%]">Amount</th>
                    {isDraft && <th className="w-[3%]" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 pr-2">
                        <input
                          className={`w-full text-sm text-gray-800 bg-transparent focus:outline-none ${isDraft ? 'border-b border-transparent hover:border-gray-200 focus:border-primary-400' : ''}`}
                          value={item.description}
                          onChange={e => updateItem(idx, 'description', e.target.value)}
                          placeholder="Service description"
                          disabled={!isDraft}
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          className={`w-full text-right text-sm text-gray-800 bg-transparent focus:outline-none ${isDraft ? 'border-b border-transparent hover:border-gray-200 focus:border-primary-400' : ''}`}
                          value={item.qty}
                          onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                          disabled={!isDraft}
                          min={0}
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          className={`w-full text-right text-sm text-gray-800 bg-transparent focus:outline-none ${isDraft ? 'border-b border-transparent hover:border-gray-200 focus:border-primary-400' : ''}`}
                          value={item.rate}
                          onChange={e => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                          disabled={!isDraft}
                          min={0}
                        />
                      </td>
                      <td className="py-2 pl-1 text-right font-medium text-gray-700">
                        {formatCurrency(item.amount, currency)}
                      </td>
                      {isDraft && (
                        <td className="py-2 pl-1">
                          <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400 transition-colors" disabled={items.length === 1}>
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isDraft && (
              <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors mt-1">
                <Plus size={13} /> Add line item
              </button>
            )}
          </div>

          {/* Notes */}
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Notes</h2>
            <textarea
              className="input w-full h-24 resize-none text-sm"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Payment terms, bank details, or any other notes…"
              disabled={!isDraft}
            />
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 flex-1">Tax (%)</span>
                <input
                  type="number"
                  className="input w-20 text-right text-sm py-1"
                  value={taxRate}
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  disabled={!isDraft}
                  min={0}
                  max={100}
                />
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax amount</span>
                  <span>{formatCurrency(taxAmount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                <span>Total</span>
                <span className="text-primary-700">{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </div>

          {!isNew && invoice && (
            <div className="card p-5 space-y-3 text-sm">
              <h2 className="font-semibold text-gray-800">Status Timeline</h2>
              <div className="space-y-2.5">
                {[
                  { key: 'DRAFT', label: 'Created as Draft' },
                  { key: 'SENT', label: 'Sent to Client' },
                  { key: 'PAID', label: 'Payment Received' },
                ].map((step, i) => {
                  const order = ['DRAFT', 'SENT', 'PAID', 'OVERDUE'];
                  const currentIdx = order.indexOf(invoice.status);
                  const stepIdx = order.indexOf(step.key);
                  const done = stepIdx <= currentIdx && !(invoice.status === 'OVERDUE' && step.key === 'PAID');
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-primary-600' : 'bg-gray-100'}`}>
                        {done && <CheckCircle size={12} className="text-white" />}
                      </div>
                      <span className={done ? 'text-gray-700 font-medium' : 'text-gray-400'}>{step.label}</span>
                    </div>
                  );
                })}
                {invoice.status === 'OVERDUE' && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle size={12} className="text-red-500" />
                    </div>
                    <span className="text-red-600 font-medium">Marked Overdue</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
