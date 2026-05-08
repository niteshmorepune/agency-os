import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft, Edit2, Save, X, Globe, Mail, DollarSign,
  Users, BarChart2, Plus, Trash2, UserPlus, Building2, ClipboardList, TrendingUp,
  CheckCircle2, Circle, PartyPopper,
} from 'lucide-react';
import { api } from '../api/client';

interface AssignedUser {
  userId: string;
  user: { id: string; name: string; role: string; avatarUrl?: string };
}

interface ClientDetail {
  id: string;
  name: string;
  domain: string;
  brandName?: string;
  industry?: string;
  targetAudience?: string;
  competitors: string[];
  monthlyRetainer?: number;
  contactName?: string;
  contactEmail?: string;
  notes?: string;
  status: string;
  createdAt: string;
  onboardingComplete: boolean;
  assignments: AssignedUser[];
}

interface PlatformScore {
  platform: string;
  score: number;
  checksTotal?: number;
  checksPassed?: number;
  updatedAt?: string;
}

interface AgencyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

const editSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().min(1).max(200),
  brandName: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  targetAudience: z.string().max(500).optional(),
  monthlyRetainer: z.coerce.number().positive().optional().or(z.literal('')),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'CHURNED']),
});

type EditForm = z.infer<typeof editSchema>;

const PLATFORM_COLORS: Record<string, string> = {
  LINKEDIN: 'bg-blue-600',
  INSTAGRAM: 'bg-pink-500',
  FACEBOOK: 'bg-blue-500',
  GBP: 'bg-green-600',
  YOUTUBE: 'bg-red-600',
  TWITTER: 'bg-sky-500',
  TIKTOK: 'bg-gray-900',
  PINTEREST: 'bg-red-500',
  GOOGLE_ADS: 'bg-yellow-500',
  EMAIL: 'bg-purple-600',
  WHATSAPP: 'bg-green-500',
};

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-500';
}

function scoreBarColor(score: number) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-400';
  return 'bg-red-400';
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    OWNER: 'bg-purple-100 text-purple-700',
    ACCOUNT_MANAGER: 'bg-blue-100 text-blue-700',
    CONTENT_CREATOR: 'bg-pink-100 text-pink-700',
    SEO_ANALYST: 'bg-green-100 text-green-700',
    CLIENT: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {role.replace('_', ' ')}
    </span>
  );
}

function OverviewTab({ client, onSaved }: { client: ClientDetail; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [competitorInput, setCompetitorInput] = useState('');
  const [competitors, setCompetitors] = useState<string[]>(client.competitors ?? []);
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: client.name,
      domain: client.domain,
      brandName: client.brandName ?? '',
      industry: client.industry ?? '',
      targetAudience: client.targetAudience ?? '',
      monthlyRetainer: client.monthlyRetainer ?? '',
      contactName: client.contactName ?? '',
      contactEmail: client.contactEmail ?? '',
      notes: client.notes ?? '',
      status: client.status as 'ACTIVE' | 'PAUSED' | 'CHURNED',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: EditForm) => {
      const payload = {
        ...data,
        competitors,
        monthlyRetainer: data.monthlyRetainer === '' ? undefined : Number(data.monthlyRetainer),
        contactEmail: data.contactEmail === '' ? undefined : data.contactEmail,
      };
      return api.put(`/clients/${client.id}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', client.id] });
      setEditing(false);
      onSaved();
      toast.success('Client updated');
    },
    onError: () => toast.error('Failed to save changes'),
  });

  function cancelEdit() {
    reset();
    setCompetitors(client.competitors ?? []);
    setEditing(false);
  }

  function addCompetitor() {
    const val = competitorInput.trim();
    if (val && !competitors.includes(val)) {
      setCompetitors(prev => [...prev, val]);
    }
    setCompetitorInput('');
  }

  return (
    <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-6">
      <div className="flex justify-end gap-2">
        {editing ? (
          <>
            <button type="button" onClick={cancelEdit} className="btn-secondary flex items-center gap-2">
              <X size={16} /> Cancel
            </button>
            <button type="submit" disabled={updateMutation.isPending} className="btn-primary flex items-center gap-2">
              <Save size={16} /> {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">
            <Edit2 size={16} /> Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Building2 size={16} /> Basic Info</h3>
          <div>
            <label className="label">Client Name</label>
            {editing ? <input {...register('name')} className="input" /> : <p className="text-gray-900 font-medium">{client.name}</p>}
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Domain</label>
            {editing ? <input {...register('domain')} className="input" /> : (
              <a href={`https://${client.domain}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline flex items-center gap-1">
                <Globe size={14} /> {client.domain}
              </a>
            )}
          </div>
          <div>
            <label className="label">Brand Name</label>
            {editing ? <input {...register('brandName')} className="input" placeholder="e.g. Acme Co." /> : <p className="text-gray-700">{client.brandName || '—'}</p>}
          </div>
          <div>
            <label className="label">Industry</label>
            {editing ? <input {...register('industry')} className="input" placeholder="e.g. E-commerce" /> : <p className="text-gray-700">{client.industry || '—'}</p>}
          </div>
          <div>
            <label className="label">Status</label>
            {editing ? (
              <select {...register('status')} className="input">
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="CHURNED">Churned</option>
              </select>
            ) : (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${client.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : client.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                {client.status}
              </span>
            )}
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Mail size={16} /> Contact & Revenue</h3>
          <div>
            <label className="label">Contact Name</label>
            {editing ? <input {...register('contactName')} className="input" placeholder="Primary contact" /> : <p className="text-gray-700">{client.contactName || '—'}</p>}
          </div>
          <div>
            <label className="label">Contact Email</label>
            {editing ? <input {...register('contactEmail')} className="input" type="email" /> : (
              client.contactEmail
                ? <a href={`mailto:${client.contactEmail}`} className="text-primary-600 hover:underline flex items-center gap-1"><Mail size={14} /> {client.contactEmail}</a>
                : <p className="text-gray-400">—</p>
            )}
            {errors.contactEmail && <p className="text-red-500 text-xs mt-1">{errors.contactEmail.message}</p>}
          </div>
          <div>
            <label className="label">Monthly Retainer</label>
            {editing ? (
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input {...register('monthlyRetainer')} type="number" className="input pl-8" placeholder="0" />
              </div>
            ) : (
              <p className="text-gray-700 font-medium">{client.monthlyRetainer ? `₹${client.monthlyRetainer.toLocaleString()}` : '—'}</p>
            )}
            {errors.monthlyRetainer && <p className="text-red-500 text-xs mt-1">{String(errors.monthlyRetainer.message)}</p>}
          </div>
          <div>
            <label className="label">Member Since</label>
            <p className="text-gray-500 text-sm">{new Date(client.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <div className="card p-6 space-y-4 md:col-span-2">
          <h3 className="font-semibold text-gray-800">Target Audience</h3>
          {editing
            ? <textarea {...register('targetAudience')} className="input resize-none" rows={3} placeholder="Describe the target audience…" />
            : <p className="text-gray-700 text-sm">{client.targetAudience || '—'}</p>
          }
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Competitors</h3>
          {editing ? (
            <>
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
              <div className="flex flex-wrap gap-2">
                {competitors.map(c => (
                  <span key={c} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
                    {c}
                    <button type="button" onClick={() => setCompetitors(prev => prev.filter(x => x !== c))} className="hover:text-red-500 ml-1"><X size={12} /></button>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(client.competitors ?? []).length === 0
                ? <p className="text-gray-400 text-sm">No competitors added</p>
                : client.competitors.map(c => (
                  <span key={c} className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">{c}</span>
                ))}
            </div>
          )}
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Notes</h3>
          {editing
            ? <textarea {...register('notes')} className="input resize-none" rows={4} placeholder="Internal notes…" />
            : <p className="text-gray-600 text-sm whitespace-pre-wrap">{client.notes || '—'}</p>
          }
        </div>
      </div>

      {updateMutation.isError && (
        <p className="text-red-500 text-sm">{(updateMutation.error as Error).message}</p>
      )}
    </form>
  );
}

function PlatformsTab({ clientId }: { clientId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['optimization', clientId],
    queryFn: () => api.get<{ data: PlatformScore[] }>(`/optimization/${clientId}`),
  });

  const platforms = data?.data ?? [];

  if (isLoading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (platforms.length === 0) return (
    <div className="card p-16 text-center">
      <BarChart2 size={48} className="mx-auto text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-700">No platform scores yet</h3>
      <p className="text-gray-500 mt-1">Run a platform audit to generate optimization scores.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {platforms.map(p => (
        <Link
          key={p.platform}
          to={`/optimize/${clientId}/${p.platform}`}
          className="card p-5 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className={`text-xs font-bold text-white px-2.5 py-1 rounded-lg ${PLATFORM_COLORS[p.platform] ?? 'bg-gray-500'}`}>
              {p.platform.replace('_', ' ')}
            </span>
            <span className={`text-2xl font-bold ${scoreColor(p.score)}`}>{p.score}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${scoreBarColor(p.score)}`}
              style={{ width: `${p.score}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>Score / 100</span>
            {p.updatedAt && <span>{new Date(p.updatedAt).toLocaleDateString()}</span>}
          </div>
          {p.checksTotal !== undefined && (
            <p className="text-xs text-gray-500 mt-2">
              {p.checksPassed ?? 0}/{p.checksTotal} checks passed
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}

function TeamTab({ client }: { client: ClientDetail }) {
  const [showAssign, setShowAssign] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const qc = useQueryClient();

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<{ data: AgencyUser[] }>('/users'),
    enabled: showAssign,
  });

  const assignedIds = new Set(client.assignments.map(a => a.userId));
  const availableUsers = (usersData?.data ?? []).filter(u => !assignedIds.has(u.id));

  const assignMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/clients/${client.id}/assign`, { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', client.id] });
      setSelectedUserId('');
      setShowAssign(false);
      toast.success('Team member assigned');
    },
    onError: () => toast.error('Failed to assign team member'),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/clients/${client.id}/assign`, { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', client.id] });
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Users size={16} /> Assigned Team ({client.assignments.length})</h3>
        <button onClick={() => setShowAssign(v => !v)} className="btn-secondary flex items-center gap-2">
          <UserPlus size={16} /> Assign Member
        </button>
      </div>

      {showAssign && (
        <div className="card p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="label">Select team member</label>
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="input">
              <option value="">— choose —</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { if (selectedUserId) assignMutation.mutate(selectedUserId); }}
            disabled={!selectedUserId || assignMutation.isPending}
            className="btn-primary"
          >
            {assignMutation.isPending ? 'Assigning…' : 'Assign'}
          </button>
          <button onClick={() => setShowAssign(false)} className="btn-secondary px-3"><X size={16} /></button>
        </div>
      )}

      {client.assignments.length === 0 ? (
        <div className="card p-10 text-center">
          <Users size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No team members assigned to this client yet.</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {client.assignments.map(a => (
            <div key={a.userId} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                  {a.user.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{a.user.name}</p>
                  <RoleBadge role={a.user.role} />
                </div>
              </div>
              <button
                onClick={() => removeMutation.mutate(a.userId)}
                disabled={removeMutation.isPending}
                className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                title="Remove from client"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OnboardingChecklist({ client }: { client: ClientDetail }) {
  const qc = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: () => api.post(`/client-portal/onboarding/${client.id}/complete`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client', client.id] }),
  });

  const steps = [
    { label: 'Brand & industry info filled', done: !!(client.brandName && client.industry) },
    { label: 'Contact details added', done: !!(client.contactName && client.contactEmail) },
    { label: 'Team member assigned', done: client.assignments.length > 0 },
    { label: 'Client account linked', done: client.assignments.some(a => a.user.role === 'CLIENT') },
  ];

  const completedCount = steps.filter(s => s.done).length;

  return (
    <div className="card p-5 border-l-4 border-amber-400 bg-amber-50/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-1">
            <PartyPopper size={16} className="text-amber-500" />
            Client Setup Checklist
            <span className="text-xs font-normal text-gray-500 ml-1">{completedCount}/{steps.length} done</span>
          </h3>
          <p className="text-xs text-gray-500 mb-3">Complete these steps to get the client fully onboarded.</p>
          <div className="space-y-1.5">
            {steps.map(step => (
              <div key={step.label} className="flex items-center gap-2 text-sm">
                {step.done
                  ? <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                  : <Circle size={15} className="text-gray-300 flex-shrink-0" />}
                <span className={step.done ? 'text-gray-500 line-through' : 'text-gray-700'}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => completeMutation.mutate()}
          disabled={completeMutation.isPending}
          className="btn-secondary text-sm flex-shrink-0"
        >
          {completeMutation.isPending ? 'Saving…' : 'Mark Complete'}
        </button>
      </div>
      <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-amber-400 transition-all"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

type Tab = 'overview' | 'platforms' | 'team';

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['client', id],
    queryFn: () => api.get<{ data: ClientDetail }>(`/clients/${id}`),
    enabled: !!id,
  });

  const client = data?.data;

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-10 w-48 bg-gray-100 rounded-xl animate-pulse" />
      <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  );

  if (isError || !client) return (
    <div className="card p-16 text-center">
      <p className="text-gray-500">Client not found.</p>
      <Link to="/clients" className="text-primary-600 hover:underline mt-2 inline-block">← Back to clients</Link>
    </div>
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Building2 size={16} /> },
    { id: 'platforms', label: 'Platforms', icon: <BarChart2 size={16} /> },
    { id: 'team', label: 'Team', icon: <Users size={16} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/clients')} className="mt-1 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{client.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${client.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : client.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
              {client.status}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><Globe size={13} />{client.domain}</span>
            {client.industry && <span>{client.industry}</span>}
            {client.monthlyRetainer && <span className="flex items-center gap-1"><DollarSign size={13} />₹{client.monthlyRetainer.toLocaleString()}/mo</span>}
            <span className="flex items-center gap-1"><Users size={13} />{client.assignments.length} members</span>
          </div>
        </div>
        <Link to={`/optimize/${client.id}`} className="btn-secondary flex items-center gap-2 flex-shrink-0 text-sm">
          <TrendingUp size={16} /> Optimize
        </Link>
        <Link to={`/audit/${client.id}`} className="btn-secondary flex items-center gap-2 flex-shrink-0 text-sm">
          <ClipboardList size={16} /> Audits
        </Link>
      </div>

      {!client.onboardingComplete && <OnboardingChecklist client={client} />}

      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'overview' && <OverviewTab client={client} onSaved={() => qc.invalidateQueries({ queryKey: ['client', id] })} />}
        {activeTab === 'platforms' && <PlatformsTab clientId={client.id} />}
        {activeTab === 'team' && <TeamTab client={client} />}
      </div>
    </div>
  );
}
