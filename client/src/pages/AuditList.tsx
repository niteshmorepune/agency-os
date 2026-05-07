import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, ClipboardList, CheckCircle, Clock, Archive, Download, Trash2 } from 'lucide-react';
import { api } from '../api/client';

interface AuditSummary {
  id: string;
  name: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  overallScore: number | null;
  createdAt: string;
  updatedAt: string;
  _count: { checks: number };
}

interface ClientBasic {
  id: string;
  name: string;
  domain: string;
}

const schema = z.object({ name: z.string().min(1, 'Required').max(200) });

function scoreColor(score: number | null) {
  if (score === null) return 'text-gray-400';
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-500';
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'COMPLETED') return <CheckCircle size={16} className="text-green-500" />;
  if (status === 'ARCHIVED') return <Archive size={16} className="text-gray-400" />;
  return <Clock size={16} className="text-blue-500" />;
}

export default function AuditList() {
  const { clientId } = useParams<{ clientId: string }>();
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();

  const { data: clientData } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => api.get<{ data: ClientBasic }>(`/clients/${clientId}`),
    enabled: !!clientId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['audits', clientId],
    queryFn: () => api.get<{ data: AuditSummary[] }>(`/audit/${clientId}`),
    enabled: !!clientId,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ name: string }>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  const createMutation = useMutation({
    mutationFn: (d: { name: string }) => api.post(`/audit/${clientId}`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audits', clientId] });
      reset();
      setShowCreate(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (auditId: string) => api.delete(`/audit/${clientId}/${auditId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audits', clientId] }),
  });

  const client = clientData?.data;
  const audits = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link to={`/clients/${clientId}`} className="mt-1 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 flex-shrink-0">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to={`/clients/${clientId}`} className="hover:text-primary-600">{client?.name ?? '…'}</Link>
            <span>/</span>
            <span>Audits</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Digital Marketing Audits</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Full-site audit across 7 modules — {audits.length} audit{audits.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(v => !v)} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <Plus size={18} /> New Audit
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="card p-5 flex gap-3 items-end max-w-lg">
          <div className="flex-1">
            <label className="label">Audit Name</label>
            <input {...register('name')} className="input" placeholder="e.g. Q2 2026 Full Audit" autoFocus />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </button>
          <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary px-3"><Plus size={16} className="rotate-45" /></button>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : audits.length === 0 ? (
        <div className="card p-16 text-center">
          <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No audits yet</h3>
          <p className="text-gray-500 mt-1">Create your first audit to get started — it covers 7 modules and 70+ checks.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={18} /> New Audit
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {audits.map(audit => (
            <div key={audit.id} className="card p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className="flex-shrink-0">
                <StatusIcon status={audit.status} />
              </div>
              <Link to={`/audit/${clientId}/${audit.id}`} className="flex-1 min-w-0 group">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors truncate">{audit.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${audit.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : audit.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                    {audit.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {audit._count.checks} checks · Last updated {new Date(audit.updatedAt).toLocaleDateString('en-IN')}
                </p>
              </Link>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${scoreColor(audit.overallScore)}`}>
                    {audit.overallScore ?? '—'}
                  </div>
                  <div className="text-xs text-gray-400">score</div>
                </div>
                <a
                  href={`/api/audit/${clientId}/${audit.id}/report`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors"
                  title="Download PDF Report"
                >
                  <Download size={18} />
                </a>
                <button
                  onClick={() => { if (window.confirm('Delete this audit?')) deleteMutation.mutate(audit.id); }}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete audit"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
