import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft, Edit2, Save, X, Globe, Mail, DollarSign,
  Users, BarChart2, Plus, Trash2, UserPlus, Building2, ClipboardList, TrendingUp,
  CheckCircle2, Circle, PartyPopper, Send, MessageSquare, Calendar, AlertCircle, Link2,
  Share2, CheckCircle, XCircle, Loader2,
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
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
  reportSchedule: 'NONE' | 'MONTHLY';
  lastReportEmailedAt: string | null;
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

interface ActionItem {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

interface ClientMessage {
  id: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  body: string;
  isRead: boolean;
  createdAt: string;
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

function ActionItemsTab({ clientId }: { clientId: string }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isManager = user?.role === 'OWNER' || user?.role === 'ACCOUNT_MANAGER';
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['action-items', clientId],
    queryFn: () => api.get<{ data: ActionItem[] }>(`/clients/${clientId}/action-items`),
    staleTime: 30_000,
  });
  const items = data?.data ?? [];

  const createItem = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setCreating(true);
    try {
      await api.post(`/clients/${clientId}/action-items`, {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      qc.invalidateQueries({ queryKey: ['action-items', clientId] });
      setTitle(''); setDescription(''); setDueDate('');
      setShowForm(false);
      toast.success('Action item created');
    } catch {
      toast.error('Failed to create action item');
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (itemId: string, status: string) => {
    try {
      await api.put(`/clients/action-items/${itemId}`, { status });
      qc.invalidateQueries({ queryKey: ['action-items', clientId] });
    } catch {
      toast.error('Failed to update status');
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await api.delete(`/clients/action-items/${itemId}`);
      qc.invalidateQueries({ queryKey: ['action-items', clientId] });
      toast.success('Deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {isManager && (
        <div className="flex justify-end">
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm flex items-center gap-2">
            <Plus size={15} /> New Action Item
          </button>
        </div>
      )}

      {showForm && (
        <div className="card p-4 space-y-3 border-2 border-primary-100">
          <h4 className="font-semibold text-sm text-gray-700">New Action Item</h4>
          <input
            className="input"
            placeholder="Title (required)"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <div>
            <label className="label">Due date (optional)</label>
            <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={createItem} disabled={creating} className="btn-primary text-sm">{creating ? 'Creating…' : 'Create'}</button>
            <button onClick={() => { setShowForm(false); setTitle(''); setDescription(''); setDueDate(''); }} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center">
          <CheckCircle2 size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No action items yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const isOverdue = !!(item.dueDate && item.status !== 'COMPLETED' && item.status !== 'CANCELLED' && new Date(item.dueDate) < new Date());
            return (
              <div key={item.id} className={`card p-4 flex items-start gap-3 ${isOverdue ? 'border-l-4 border-red-400' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-medium text-sm ${item.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${STATUS_COLORS[item.status]}`}>{item.status.replace('_', ' ')}</span>
                  </div>
                  {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                  {item.dueDate && (
                    <span className={`flex items-center gap-1 text-xs mt-1.5 ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                      <Calendar size={11} />
                      {new Date(item.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {isOverdue && ' · Overdue'}
                    </span>
                  )}
                </div>
                {isManager && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {item.status === 'PENDING' && (
                      <button onClick={() => updateStatus(item.id, 'IN_PROGRESS')} className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium">Start</button>
                    )}
                    {item.status === 'IN_PROGRESS' && (
                      <button onClick={() => updateStatus(item.id, 'COMPLETED')} className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium">Done</button>
                    )}
                    <button onClick={() => deleteItem(item.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MessagesTab({ clientId }: { clientId: string }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['client-messages', clientId],
    queryFn: () => api.get<{ data: ClientMessage[] }>(`/clients/${clientId}/messages`),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
  const messages = data?.data ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    api.put(`/clients/${clientId}/messages/read`, {}).catch(() => {});
  }, [clientId]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await api.post(`/clients/${clientId}/messages`, { body: body.trim() });
      setBody('');
      qc.invalidateQueries({ queryKey: ['client-messages', clientId] });
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-3">
      <div className="card p-0 overflow-hidden">
        <div className="h-96 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <MessageSquare size={32} className="mb-2" />
              <p className="text-sm">No messages yet. Start the conversation.</p>
            </div>
          ) : (
            messages.map(msg => {
              const isOurs = msg.senderId === user?.id;
              return (
                <div key={msg.id} className={`flex ${isOurs ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isOurs ? 'bg-primary-800 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'}`}>
                    {!isOurs && <p className="text-xs font-semibold mb-0.5 text-gray-400">{msg.senderName}</p>}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                    <p className={`text-[10px] mt-1 ${isOurs ? 'text-primary-200' : 'text-gray-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-gray-200 p-3 bg-white flex gap-2">
          <textarea
            className="input flex-1 resize-none text-sm"
            rows={2}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button onClick={send} disabled={sending || !body.trim()} className="btn-primary px-3 self-end flex items-center gap-1.5 text-sm">
            <Send size={14} /> {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center">Messages refresh every 30 s · Client receives email on new message</p>
    </div>
  );
}

function ReportsTab({ client }: { client: ClientDetail }) {
  const qc = useQueryClient();
  const [schedule, setSchedule] = useState<'NONE' | 'MONTHLY'>(client.reportSchedule);
  const [sending, setSending] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  const scheduleMutation = useMutation({
    mutationFn: () => api.patch(`/reports/schedule/${client.id}`, { reportSchedule: schedule }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client', client.id] }); toast.success('Report schedule saved'); },
    onError: () => toast.error('Failed to save schedule'),
  });

  async function sendNow() {
    setSending(true);
    try {
      const res = await api.post<{ message: string }>(`/reports/email/${client.id}`, {});
      qc.invalidateQueries({ queryKey: ['client', client.id] });
      toast.success(res.message ?? 'Report sent');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to send report');
    }
    setSending(false);
  }

  async function sendOnboardingLink() {
    setSendingLink(true);
    try {
      await api.post(`/clients/${client.id}/onboarding/send-link`, {});
      toast.success('Onboarding link sent to ' + (client.contactEmail ?? 'client'));
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to send link');
    } finally {
      setSendingLink(false);
    }
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-800 text-sm">Client Onboarding Link</h3>
        <p className="text-sm text-gray-600">Send a branded onboarding questionnaire to the client. They fill in their business goals, social handles, brand voice, and more — no login required.</p>
        {!client.contactEmail ? (
          <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-100 rounded-lg p-3">
            <AlertCircle size={14} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-800 text-xs">No contact email set. Add one in the Overview tab first.</p>
          </div>
        ) : (
          <button onClick={sendOnboardingLink} disabled={sendingLink} className="btn-secondary text-sm flex items-center gap-2">
            <Link2 size={14} /> {sendingLink ? 'Sending…' : 'Send Onboarding Link'}
          </button>
        )}
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-800 text-sm">Report Schedule</h3>
        <div className="space-y-1">
          <label className="label">Auto-send frequency</label>
          <select
            className="input w-full"
            value={schedule}
            onChange={e => setSchedule(e.target.value as 'NONE' | 'MONTHLY')}
          >
            <option value="NONE">None (manual only)</option>
            <option value="MONTHLY">Monthly (1st of each month)</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">Monthly reports are sent automatically to the client's contact email on the 1st of each month.</p>
        </div>
        <button
          onClick={() => scheduleMutation.mutate()}
          disabled={scheduleMutation.isPending || schedule === client.reportSchedule}
          className="btn-primary text-sm"
        >
          {scheduleMutation.isPending ? 'Saving…' : 'Save Schedule'}
        </button>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-800 text-sm">Send Report Now</h3>
        {!client.contactEmail ? (
          <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-100 rounded-lg p-3">
            <span className="text-yellow-500 text-xs font-bold mt-0.5 flex-shrink-0">NOTE</span>
            <p className="text-yellow-800 text-xs">No contact email set for this client. Add one in the Overview tab first.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Sends this month's PDF performance report to <strong>{client.contactEmail}</strong>.
            </p>
            {client.lastReportEmailedAt && (
              <p className="text-xs text-gray-400">
                Last sent: {new Date(client.lastReportEmailedAt).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
            <button
              onClick={sendNow}
              disabled={sending}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <Send size={14} /> {sending ? 'Sending…' : 'Send Report Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const SOCIAL_PLATFORMS = [
  { value: 'FACEBOOK', label: 'Facebook', hint: 'Page ID (numeric)' },
  { value: 'INSTAGRAM', label: 'Instagram', hint: 'Instagram Business Account ID (numeric)' },
  { value: 'LINKEDIN', label: 'LinkedIn', hint: 'organization:123456 or person:abc123' },
  { value: 'TWITTER', label: 'X / Twitter', hint: 'Coming soon' },
];

interface SocialAccount {
  id: string;
  platform: string;
  accountName: string;
  accountId: string;
  isActive: boolean;
  tokenExpiresAt: string | null;
  createdAt: string;
}

const connectSocialSchema = z.object({
  platform: z.enum(['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE']),
  accountName: z.string().min(1).max(200),
  accountId: z.string().min(1).max(500),
  accessToken: z.string().min(1),
  tokenExpiresAt: z.string().optional(),
});
type ConnectSocialForm = z.infer<typeof connectSocialSchema>;

function SocialAccountsTab({ clientId }: { clientId: string }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; name?: string; error?: string }>>({});

  const canManage = user?.role === 'OWNER' || user?.role === 'ACCOUNT_MANAGER';

  const { data, isLoading } = useQuery({
    queryKey: ['social-accounts', clientId],
    queryFn: () => api.get<{ data: SocialAccount[] }>(`/social?clientId=${clientId}`),
    staleTime: 30_000,
  });
  const accounts = data?.data ?? [];

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ConnectSocialForm>({
    resolver: zodResolver(connectSocialSchema),
    defaultValues: { platform: 'FACEBOOK' },
  });
  const selectedPlatform = watch('platform');
  const platformHint = SOCIAL_PLATFORMS.find(p => p.value === selectedPlatform)?.hint ?? '';

  const connectMutation = useMutation({
    mutationFn: (data: ConnectSocialForm) => api.post('/social/connect', { ...data, clientId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-accounts', clientId] });
      toast.success('Account connected');
      reset();
      setShowForm(false);
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to connect account'),
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/social/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social-accounts', clientId] }); toast.success('Account disconnected'); },
    onError: () => toast.error('Failed to disconnect'),
  });

  async function testConnection(account: SocialAccount) {
    setTestingId(account.id);
    try {
      const res = await api.post<{ ok: boolean; name?: string; error?: string }>(`/social/${account.id}/test`, {});
      setTestResult(prev => ({ ...prev, [account.id]: res }));
      if (res.ok) {
        toast.success(`Connected as ${res.name ?? account.accountName}`);
        qc.invalidateQueries({ queryKey: ['social-accounts', clientId] });
      } else {
        toast.error(res.error ?? 'Token invalid');
      }
    } catch {
      toast.error('Test failed');
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Connected Social Accounts</h3>
          <p className="text-xs text-gray-500 mt-0.5">Posts scheduled and approved will auto-publish via these accounts.</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(v => !v)} className="btn-secondary text-sm flex items-center gap-2">
            <Plus size={15} /> Connect Account
          </button>
        )}
      </div>

      {showForm && (
        <div className="card p-5 space-y-4 border-2 border-primary-200">
          <h4 className="font-medium text-gray-800 text-sm flex items-center gap-2"><Share2 size={15} /> Add Social Account</h4>
          <form onSubmit={handleSubmit(d => connectMutation.mutate(d))} className="space-y-3">
            <div>
              <label className="label">Platform</label>
              <select {...register('platform')} className="input">
                {SOCIAL_PLATFORMS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Account Display Name</label>
              <input {...register('accountName')} className="input" placeholder="e.g. NEDS Drishti Facebook Page" />
              {errors.accountName && <p className="text-red-500 text-xs mt-1">{errors.accountName.message}</p>}
            </div>
            <div>
              <label className="label">Account / Page ID</label>
              <input {...register('accountId')} className="input" placeholder={platformHint} />
              <p className="text-xs text-gray-400 mt-1">{platformHint}</p>
              {errors.accountId && <p className="text-red-500 text-xs mt-1">{errors.accountId.message}</p>}
            </div>
            <div>
              <label className="label">Access Token</label>
              <textarea {...register('accessToken')} className="input resize-none text-xs font-mono" rows={3} placeholder="Paste page/user access token here" />
              {errors.accessToken && <p className="text-red-500 text-xs mt-1">{errors.accessToken.message}</p>}
              <p className="text-xs text-gray-400 mt-1">Token is encrypted with AES-256 before storage.</p>
            </div>
            <div>
              <label className="label">Token Expires At <span className="text-gray-400">(optional)</span></label>
              <input {...register('tokenExpiresAt')} type="datetime-local" className="input" />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={connectMutation.isPending} className="btn-primary text-sm">
                {connectMutation.isPending ? 'Saving…' : 'Save Account'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); reset(); }} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : accounts.length === 0 ? (
        <div className="card p-10 text-center">
          <Share2 size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium text-sm">No accounts connected yet</p>
          <p className="text-gray-400 text-xs mt-1">Connect Facebook, Instagram, or LinkedIn to enable auto-publishing.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(account => {
            const tr = testResult[account.id];
            const isExpired = account.tokenExpiresAt ? new Date(account.tokenExpiresAt) < new Date() : false;
            return (
              <div key={account.id} className={`card p-4 flex items-center gap-4 ${!account.isActive ? 'opacity-60' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${PLATFORM_COLORS[account.platform] ?? 'bg-gray-500'}`}>
                  {account.platform.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800">{account.accountName}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${account.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {isExpired && <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">Token expired</span>}
                    {tr && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${tr.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {tr.ok ? <CheckCircle size={10} /> : <XCircle size={10} />} {tr.ok ? (tr.name ?? 'OK') : 'Invalid token'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">ID: {account.accountId}</p>
                  {account.tokenExpiresAt && (
                    <p className="text-xs text-gray-400">Expires: {new Date(account.tokenExpiresAt).toLocaleDateString('en-IN')}</p>
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => testConnection(account)}
                      disabled={testingId === account.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors flex items-center gap-1"
                    >
                      {testingId === account.id ? <Loader2 size={12} className="animate-spin" /> : null}
                      Test
                    </button>
                    <button
                      onClick={() => { if (confirm('Disconnect this account?')) disconnectMutation.mutate(account.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 space-y-1">
        <p className="font-semibold">How auto-publishing works</p>
        <p>Posts that are <strong>Approved</strong> and <strong>Scheduled</strong> are checked every 5 minutes. When the scheduled time is reached, they are automatically published to all connected platforms for this client.</p>
        <p className="mt-1">Get access tokens from the <strong>Facebook Developer Console</strong> (for FB + Instagram) or <strong>LinkedIn Developer Portal</strong>. Long-lived page tokens are recommended.</p>
      </div>
    </div>
  );
}

interface ClientGoal {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  month: string;
}

const goalSchema = z.object({
  title: z.string().min(1).max(300),
  targetValue: z.coerce.number().positive(),
  currentValue: z.coerce.number().min(0).optional(),
  unit: z.string().max(50).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});
type GoalForm = z.infer<typeof goalSchema>;

function GoalsTab({ clientId }: { clientId: string }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const canManage = user?.role === 'OWNER' || user?.role === 'ACCOUNT_MANAGER';
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState<ClientGoal | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['client-goals', clientId, selectedMonth],
    queryFn: () => api.get<{ data: ClientGoal[] }>(`/clients/${clientId}/goals?month=${selectedMonth}`),
    staleTime: 30_000,
  });
  const goals = data?.data ?? [];

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
    defaultValues: { month: selectedMonth, currentValue: 0 },
  });

  const saveMutation = useMutation({
    mutationFn: (form: GoalForm) =>
      editGoal
        ? api.put(`/clients/${clientId}/goals/${editGoal.id}`, form)
        : api.post(`/clients/${clientId}/goals`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-goals', clientId] });
      toast.success(editGoal ? 'Goal updated' : 'Goal created');
      reset({ month: selectedMonth, currentValue: 0 });
      setShowForm(false);
      setEditGoal(null);
    },
    onError: () => toast.error('Failed to save goal'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${clientId}/goals/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-goals', clientId] }); toast.success('Goal removed'); },
  });

  function startEdit(goal: ClientGoal) {
    setEditGoal(goal);
    setValue('title', goal.title);
    setValue('targetValue', goal.targetValue);
    setValue('currentValue', goal.currentValue);
    setValue('unit', goal.unit);
    setValue('month', goal.month);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditGoal(null);
    reset({ month: selectedMonth, currentValue: 0 });
  }

  // Generate last 6 months for selector
  const months: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <select
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            {months.map(m => (
              <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400">{goals.length} goal{goals.length !== 1 ? 's' : ''}</span>
        </div>
        {canManage && (
          <button onClick={() => { setEditGoal(null); reset({ month: selectedMonth, currentValue: 0 }); setShowForm(v => !v); }} className="btn-secondary text-sm flex items-center gap-2">
            <Plus size={15} /> Add Goal
          </button>
        )}
      </div>

      {showForm && (
        <div className="card p-5 space-y-3 border-2 border-primary-200">
          <h4 className="font-medium text-gray-800 text-sm">{editGoal ? 'Edit Goal' : 'New Goal'}</h4>
          <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-3">
            <div>
              <label className="label">Goal Title</label>
              <input {...register('title')} className="input" placeholder="e.g. Grow Instagram followers by 15%" />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Target</label>
                <input {...register('targetValue')} type="number" min="0" step="any" className="input" placeholder="100" />
                {errors.targetValue && <p className="text-red-500 text-xs mt-1">{errors.targetValue.message}</p>}
              </div>
              <div>
                <label className="label">Current</label>
                <input {...register('currentValue')} type="number" min="0" step="any" className="input" placeholder="0" />
              </div>
              <div>
                <label className="label">Unit</label>
                <input {...register('unit')} className="input" placeholder="followers, reviews…" />
              </div>
            </div>
            <div>
              <label className="label">Month</label>
              <input {...register('month')} type="month" className="input" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saveMutation.isPending} className="btn-primary text-sm">
                {saveMutation.isPending ? 'Saving…' : (editGoal ? 'Update Goal' : 'Create Goal')}
              </button>
              <button type="button" onClick={cancelForm} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : goals.length === 0 ? (
        <div className="card p-12 text-center">
          <TrendingUp size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium text-sm">No goals set for this month</p>
          <p className="text-gray-400 text-xs mt-1">Add measurable goals so the client can track progress in their portal.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const pct = goal.targetValue > 0 ? Math.min((goal.currentValue / goal.targetValue) * 100, 100) : 0;
            const barColor = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-primary-600' : pct >= 30 ? 'bg-yellow-400' : 'bg-gray-300';
            return (
              <div key={goal.id} className="card p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{goal.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {goal.currentValue} / {goal.targetValue}{goal.unit ? ` ${goal.unit}` : ''} · {Math.round(pct)}%
                    </p>
                  </div>
                  {pct >= 100 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex-shrink-0">Achieved!</span>
                  )}
                  {canManage && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(goal)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><Edit2 size={13} /></button>
                      <button onClick={() => { if (confirm('Remove this goal?')) deleteMutation.mutate(goal.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400">Goals are visible in the client portal as progress bars. Update current values regularly.</p>
    </div>
  );
}

type Tab = 'overview' | 'platforms' | 'team' | 'reports' | 'action-items' | 'messages' | 'social' | 'goals';

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client deleted');
      navigate('/clients');
    },
    onError: (err: Error) => { setConfirmDelete(false); toast.error(err.message || 'Failed to delete client'); },
  });

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
    { id: 'social', label: 'Social Accounts', icon: <Share2 size={16} /> },
    { id: 'goals', label: 'Goals', icon: <TrendingUp size={16} /> },
    { id: 'team', label: 'Team', icon: <Users size={16} /> },
    { id: 'action-items', label: 'Action Items', icon: <CheckCircle2 size={16} /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={16} /> },
    { id: 'reports', label: 'Reports', icon: <Send size={16} /> },
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
        {user?.role === 'OWNER' && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
            title="Delete client"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delete client?</h3>
                <p className="text-sm text-gray-500">This will permanently delete <strong>{client.name}</strong> and all associated data. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary text-sm">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        {activeTab === 'social' && <SocialAccountsTab clientId={client.id} />}
        {activeTab === 'goals' && <GoalsTab clientId={client.id} />}
        {activeTab === 'team' && <TeamTab client={client} />}
        {activeTab === 'action-items' && <ActionItemsTab clientId={client.id} />}
        {activeTab === 'messages' && <MessagesTab clientId={client.id} />}
        {activeTab === 'reports' && <ReportsTab client={client} />}
      </div>
    </div>
  );
}
