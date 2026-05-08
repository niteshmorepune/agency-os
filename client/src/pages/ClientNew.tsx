import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { api } from '../api/client';

const schema = z.object({
  name: z.string().min(1, 'Required').max(200),
  domain: z.string().min(1, 'Required').max(200),
  brandName: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  targetAudience: z.string().max(500).optional(),
  monthlyRetainer: z.coerce.number().positive().optional().or(z.literal('')),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
});

type FormData = z.infer<typeof schema>;

export default function ClientNew() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [competitorInput, setCompetitorInput] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        competitors,
        monthlyRetainer: data.monthlyRetainer === '' ? undefined : Number(data.monthlyRetainer),
        contactEmail: data.contactEmail === '' ? undefined : data.contactEmail,
      };
      return api.post<{ data: { id: string } }>('/clients', payload);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client created');
      navigate(`/clients/${res.data.id}`);
    },
    onError: () => toast.error('Failed to create client'),
  });

  function addCompetitor() {
    const val = competitorInput.trim();
    if (val && !competitors.includes(val)) setCompetitors(prev => [...prev, val]);
    setCompetitorInput('');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/clients" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Client</h1>
          <p className="text-gray-500 text-sm mt-0.5">Add a new client to your agency</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-5">
        <div className="card p-6 space-y-5">
          <h3 className="font-semibold text-gray-800">Basic Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Client Name *</label>
              <input {...register('name')} className="input" placeholder="e.g. Acme Corp" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Domain *</label>
              <input {...register('domain')} className="input" placeholder="e.g. acme.com" />
              {errors.domain && <p className="text-red-500 text-xs mt-1">{errors.domain.message}</p>}
            </div>
            <div>
              <label className="label">Brand Name</label>
              <input {...register('brandName')} className="input" placeholder="Public brand name" />
            </div>
            <div>
              <label className="label">Industry</label>
              <input {...register('industry')} className="input" placeholder="e.g. E-commerce" />
            </div>
          </div>
          <div>
            <label className="label">Target Audience</label>
            <textarea {...register('targetAudience')} className="input resize-none" rows={2} placeholder="Describe the target audience…" />
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <h3 className="font-semibold text-gray-800">Contact & Revenue</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Contact Name</label>
              <input {...register('contactName')} className="input" placeholder="Primary contact" />
            </div>
            <div>
              <label className="label">Contact Email</label>
              <input {...register('contactEmail')} className="input" type="email" placeholder="contact@client.com" />
              {errors.contactEmail && <p className="text-red-500 text-xs mt-1">{errors.contactEmail.message}</p>}
            </div>
            <div>
              <label className="label">Monthly Retainer (₹)</label>
              <input {...register('monthlyRetainer')} type="number" className="input" placeholder="0" />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Competitors</h3>
          <div className="flex gap-2">
            <input
              value={competitorInput}
              onChange={e => setCompetitorInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompetitor(); } }}
              className="input flex-1"
              placeholder="Add competitor domain"
            />
            <button type="button" onClick={addCompetitor} className="btn-secondary px-3"><Plus size={16} /></button>
          </div>
          {competitors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {competitors.map(c => (
                <span key={c} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
                  {c}
                  <button type="button" onClick={() => setCompetitors(prev => prev.filter(x => x !== c))} className="hover:text-red-500 ml-1"><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Notes</h3>
          <textarea {...register('notes')} className="input resize-none" rows={3} placeholder="Internal notes about this client…" />
        </div>

        {createMutation.isError && (
          <p className="text-red-500 text-sm">{(createMutation.error as Error).message}</p>
        )}

        <div className="flex gap-3 justify-end">
          <Link to="/clients" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? 'Creating…' : 'Create Client'}
          </button>
        </div>
      </form>
    </div>
  );
}
