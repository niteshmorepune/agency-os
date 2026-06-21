import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import { Building2, Key, Users, Eye, EyeOff, Plus, Check, X, Pencil, Webhook, Trash2, RefreshCw, Copy, FlaskConical, UserCircle, Bell, AlertTriangle, FileText, Clock, Send } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Agency {
  id: string; name: string; primaryColor: string; accentColor: string;
  fontFamily: string; reportTagline: string | null; reportFooter: string | null;
  aiMonthlyBudgetUsd: number;
  apiKeys: { anthropicKey: string; psiApiKey: string; ahrefsKey: string; dataforseKey: string; smtpHost: string; smtpUser: string; smtpPass: string; };
}
interface TeamUser { id: string; name: string; email: string; role: string; isActive: boolean; lastLoginAt: string | null; avatarUrl: string | null; }

// ── Helpers ────────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner', ACCOUNT_MANAGER: 'Account Manager',
  CONTENT_CREATOR: 'Content Creator', SEO_ANALYST: 'SEO Analyst',
  CLIENT: 'Client', AUDITOR: 'Auditor',
};
const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700', ACCOUNT_MANAGER: 'bg-blue-100 text-blue-700',
  CONTENT_CREATOR: 'bg-green-100 text-green-700', SEO_ANALYST: 'bg-yellow-100 text-yellow-700',
  CLIENT: 'bg-gray-100 text-gray-600', AUDITOR: 'bg-orange-100 text-orange-700',
};

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
      <Icon size={16} />{label}
    </button>
  );
}

// ── Branding Tab ───────────────────────────────────────────────────────────────
const brandingSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color'),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color'),
  fontFamily: z.enum(['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans']),
  reportTagline: z.string().max(200).optional(),
  reportFooter: z.string().max(500).optional(),
});
type BrandingForm = z.infer<typeof brandingSchema>;

function BrandingTab({ agency }: { agency: Agency }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm<BrandingForm>({
    resolver: zodResolver(brandingSchema),
    defaultValues: { name: agency.name, primaryColor: agency.primaryColor, accentColor: agency.accentColor, fontFamily: agency.fontFamily as BrandingForm['fontFamily'], reportTagline: agency.reportTagline ?? '', reportFooter: agency.reportFooter ?? '' },
  });
  const primary = watch('primaryColor');
  const accent = watch('accentColor');

  const mutation = useMutation({
    mutationFn: (data: BrandingForm) => api.put('/agency/branding', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agency'] }); toast.success('Branding saved'); },
    onError: () => toast.error('Failed to save branding'),
  });

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-6">
      <div>
        <label className="label">Agency Name</label>
        <input {...register('name')} className="input" />
        {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Primary Color</label>
          <div className="flex gap-2">
            <input type="color" value={primary} onChange={e => setValue('primaryColor', e.target.value, { shouldDirty: true })} className="w-10 h-10 rounded border cursor-pointer p-0.5" />
            <input {...register('primaryColor')} className="input flex-1 font-mono" placeholder="#1a472a" />
          </div>
          {errors.primaryColor && <p className="text-red-600 text-xs mt-1">{errors.primaryColor.message}</p>}
        </div>
        <div>
          <label className="label">Accent Color</label>
          <div className="flex gap-2">
            <input type="color" value={accent} onChange={e => setValue('accentColor', e.target.value, { shouldDirty: true })} className="w-10 h-10 rounded border cursor-pointer p-0.5" />
            <input {...register('accentColor')} className="input flex-1 font-mono" placeholder="#c8522a" />
          </div>
          {errors.accentColor && <p className="text-red-600 text-xs mt-1">{errors.accentColor.message}</p>}
        </div>
      </div>

      <div>
        <label className="label">Font Family</label>
        <select {...register('fontFamily')} className="input">
          {['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans'].map(f => <option key={f}>{f}</option>)}
        </select>
      </div>

      <div>
        <label className="label">Report Tagline</label>
        <input {...register('reportTagline')} className="input" placeholder="Digital Growth for Modern Businesses" />
      </div>

      <div>
        <label className="label">Report Footer</label>
        <textarea {...register('reportFooter')} className="input min-h-[80px] resize-none" placeholder="© 2026 Your Agency. All rights reserved." />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={!isDirty || mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Saving...' : 'Save Branding'}
        </button>
        {mutation.isSuccess && <span className="flex items-center gap-1 text-green-600 text-sm"><Check size={16} /> Saved</span>}
        {mutation.isError && <span className="text-red-600 text-sm">Save failed</span>}
      </div>
    </form>
  );
}

// ── API Keys Tab ───────────────────────────────────────────────────────────────
const apiKeySchema = z.object({
  anthropicKey: z.string().optional(),
  psiApiKey: z.string().optional(),
  ahrefsKey: z.string().optional(),
  dataforseKey: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  aiMonthlyBudgetUsd: z.coerce.number().min(0).max(1000),
});
type ApiKeyForm = z.infer<typeof apiKeySchema>;

function MaskedInput({ name, label, hint, register }: { name: keyof ApiKeyForm; label: string; hint?: string; register: ReturnType<typeof useForm<ApiKeyForm>>['register'] }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input {...register(name)} type={show ? 'text' : 'password'} className="input pr-10" placeholder="Enter new value to update" />
        <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function ApiKeysTab({ agency }: { agency: Agency }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isDirty } } = useForm<ApiKeyForm>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: { smtpHost: agency.apiKeys.smtpHost, smtpUser: agency.apiKeys.smtpUser, aiMonthlyBudgetUsd: agency.aiMonthlyBudgetUsd },
  });

  const keysMutation = useMutation({
    mutationFn: (data: ApiKeyForm) => {
      const { aiMonthlyBudgetUsd, ...keys } = data;
      return Promise.all([
        api.put('/agency/api-keys', keys),
        api.put('/agency/budget', { aiMonthlyBudgetUsd }),
      ]);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agency'] }); toast.success('API keys saved'); },
    onError: () => toast.error('Failed to save API keys'),
  });

  const isSet = (v: string) => v === '••••••••';

  return (
    <form onSubmit={handleSubmit(d => keysMutation.mutate(d))} className="space-y-8">
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Key size={16} /> AI Integration</h3>
        <MaskedInput name="anthropicKey" label={`Anthropic API Key ${isSet(agency.apiKeys.anthropicKey) ? '✓ Configured' : '— Not set'}`} hint="Required for all AI features" register={register} />
        <div>
          <label className="label">AI Monthly Budget (USD)</label>
          <input {...register('aiMonthlyBudgetUsd')} type="number" min={0} max={1000} step={5} className="input max-w-xs" />
          <p className="text-xs text-gray-400 mt-1">Hard cap on Claude API spend per month</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">SEO & Analytics</h3>
        <MaskedInput name="psiApiKey" label={`Google PSI API Key ${isSet(agency.apiKeys.psiApiKey) ? '✓ Configured' : '— Not set'}`} hint="For PageSpeed Insights checks" register={register} />
        <MaskedInput name="ahrefsKey" label={`Ahrefs API Key ${isSet(agency.apiKeys.ahrefsKey) ? '✓ Configured' : '— Not set'}`} register={register} />
        <MaskedInput name="dataforseKey" label={`DataForSEO Key ${isSet(agency.apiKeys.dataforseKey) ? '✓ Configured' : '— Not set'}`} register={register} />
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">Email (SMTP)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">SMTP Host</label>
            <input {...register('smtpHost')} className="input" placeholder="smtp.brevo.com" />
          </div>
          <div>
            <label className="label">SMTP User</label>
            <input {...register('smtpUser')} className="input" placeholder="your@email.com" />
          </div>
        </div>
        <MaskedInput name="smtpPass" label={`SMTP Password ${isSet(agency.apiKeys.smtpPass) ? '✓ Configured' : '— Not set'}`} register={register} />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={!isDirty || keysMutation.isPending} className="btn-primary">
          {keysMutation.isPending ? 'Saving...' : 'Save Keys'}
        </button>
        {keysMutation.isSuccess && <span className="flex items-center gap-1 text-green-600 text-sm"><Check size={16} /> Saved</span>}
        {keysMutation.isError && <span className="text-red-600 text-sm">Save failed</span>}
      </div>
    </form>
  );
}

// ── Team Tab ───────────────────────────────────────────────────────────────────
const inviteSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Valid email required'),
  role: z.enum(['ACCOUNT_MANAGER', 'CONTENT_CREATOR', 'SEO_ANALYST', 'CLIENT']),
  password: z.string().min(8, 'Min 8 characters'),
});
type InviteForm = z.infer<typeof inviteSchema>;

function TeamTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');

  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<{ data: TeamUser[] }>('/users'),
  });
  const users = data?.data ?? [];

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'ACCOUNT_MANAGER' },
  });

  const inviteMutation = useMutation({
    mutationFn: (d: InviteForm) => api.post('/users', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); reset(); setShowForm(false); toast.success('Team member invited'); },
    onError: () => toast.error('Failed to invite team member'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.put(`/users/${id}`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditingId(null); toast.success('Role updated'); },
    onError: () => toast.error('Failed to update role'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.put(`/users/${id}`, { isActive: !isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: () => toast.error('Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Member removed'); },
    onError: (err: Error) => toast.error(err.message || 'Failed to remove member'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">{users.length} team member{users.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary text-sm">
          <Plus size={16} />{showForm ? 'Cancel' : 'Invite Member'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(d => inviteMutation.mutate(d))} className="card p-5 space-y-4 border-2 border-primary-200">
          <h3 className="font-semibold text-gray-800">Invite Team Member</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input {...register('name')} className="input" placeholder="Jane Smith" />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="jane@agency.com" />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Role</label>
              <select {...register('role')} className="input">
                <option value="ACCOUNT_MANAGER">Account Manager</option>
                <option value="CONTENT_CREATOR">Content Creator</option>
                <option value="SEO_ANALYST">SEO Analyst</option>
                <option value="CLIENT">Client</option>
              </select>
            </div>
            <div>
              <label className="label">Temporary Password</label>
              <input {...register('password')} type="password" className="input" />
              {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
            </div>
          </div>
          {inviteMutation.isError && <p className="text-red-600 text-sm">{(inviteMutation.error as Error).message}</p>}
          <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Inviting...' : 'Send Invite'}</button>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Member', 'Role', 'Status', 'Last Login', ''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-700 font-semibold text-xs">{u.name[0]}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-gray-400 text-xs">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {editingId === u.id ? (
                    <div className="flex items-center gap-1">
                      <select value={editRole} onChange={e => setEditRole(e.target.value)} className="input text-xs py-1 px-2 w-36">
                        {['OWNER','ACCOUNT_MANAGER','CONTENT_CREATOR','SEO_ANALYST','CLIENT'].map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                      <button onClick={() => updateMutation.mutate({ id: u.id, role: editRole })} className="p-1 text-green-600 hover:text-green-800"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>{ROLE_LABELS[u.role] ?? u.role}</span>
                      <button onClick={() => { setEditingId(u.id); setEditRole(u.role); }} className="p-1 text-gray-300 hover:text-gray-600"><Pencil size={12} /></button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => toggleMutation.mutate({ id: u.id, isActive: u.isActive })}
                      className={`text-xs font-medium ${u.isActive ? 'text-orange-500 hover:text-orange-700' : 'text-green-600 hover:text-green-800'}`}
                    >
                      {u.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                    {u.role !== 'OWNER' && (
                      <button
                        onClick={() => { if (window.confirm(`Remove ${u.name} permanently? This cannot be undone.`)) deleteMutation.mutate(u.id); }}
                        disabled={deleteMutation.isPending}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete member"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Webhooks Tab ───────────────────────────────────────────────────────────────
interface WebhookRow {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  lastDeliveryAt: string | null;
  lastStatus: number | null;
}

const ALL_EVENTS = [
  { key: 'post.approved',  label: 'Post Approved' },
  { key: 'post.rejected',  label: 'Post Rejected' },
  { key: 'post.published', label: 'Post Published' },
  { key: 'invoice.sent',   label: 'Invoice Sent' },
  { key: 'invoice.paid',   label: 'Invoice Paid' },
  { key: 'audit.completed',label: 'Audit Completed' },
];

const webhookFormSchema = z.object({
  name: z.string().min(1, 'Name required'),
  url:  z.string().url('Must be a valid HTTPS URL'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
  isActive: z.boolean(),
});
type WebhookForm = z.infer<typeof webhookFormSchema>;

function WebhooksTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [revealSecret, setRevealSecret] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => api.get<{ data: WebhookRow[] }>('/webhooks'),
  });
  const webhooks = data?.data ?? [];

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<WebhookForm>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: { name: '', url: '', events: [], isActive: true },
  });
  const selectedEvents = watch('events');

  function toggleEvent(key: string) {
    const current = watch('events');
    setValue('events', current.includes(key) ? current.filter(e => e !== key) : [...current, key]);
  }

  function startEdit(w: WebhookRow) {
    setEditId(w.id);
    setShowForm(true);
    reset({ name: w.name, url: w.url, events: w.events, isActive: w.isActive });
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    reset({ name: '', url: '', events: [], isActive: true });
  }

  const saveMutation = useMutation({
    mutationFn: (data: WebhookForm) =>
      editId
        ? api.put(`/webhooks/${editId}`, data)
        : api.post('/webhooks', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success(editId ? 'Webhook updated' : 'Webhook created');
      cancelForm();
    },
    onError: () => toast.error('Failed to save webhook'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/webhooks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); toast.success('Webhook deleted'); },
  });

  const rotateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/webhooks/${id}/rotate-secret`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); toast.success('Secret rotated'); },
  });

  async function testWebhook(id: string) {
    setTestingId(id);
    try {
      await api.post(`/webhooks/${id}/test`, {});
      toast.success('Test delivery sent');
    } catch {
      toast.error('Test delivery failed');
    }
    setTestingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Receive HTTP POST notifications when events happen. Sign each request with HMAC-SHA256.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm flex items-center gap-2">
            <Plus size={15} /> Add Webhook
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm">{editId ? 'Edit Webhook' : 'New Webhook'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input {...register('name')} className="input w-full" placeholder="e.g. Slack notifications" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Endpoint URL</label>
              <input {...register('url')} className="input w-full" placeholder="https://example.com/webhook" />
              {errors.url && <p className="text-red-500 text-xs mt-1">{errors.url.message}</p>}
            </div>
          </div>
          <div>
            <label className="label mb-2 block">Trigger Events</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_EVENTS.map(ev => (
                <label key={ev.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(ev.key)}
                    onChange={() => toggleEvent(ev.key)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{ev.label}</span>
                </label>
              ))}
            </div>
            {errors.events && <p className="text-red-500 text-xs mt-1">{errors.events.message}</p>}
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" {...register('isActive')} className="w-4 h-4 rounded border-gray-300 text-primary-600" />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary text-sm">
              {saveMutation.isPending ? 'Saving…' : editId ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={cancelForm} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Webhook list */}
      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Webhook size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-gray-500">No webhooks configured</p>
          <p className="text-xs mt-1">Add a webhook to integrate with Zapier, Slack, or your own systems.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(w => (
            <div key={w.id} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-800 text-sm">{w.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${w.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {w.isActive ? 'Active' : 'Paused'}
                    </span>
                    {w.lastStatus !== null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${w.lastStatus >= 200 && w.lastStatus < 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        Last: {w.lastStatus === 0 ? 'timeout' : w.lastStatus}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-mono truncate">{w.url}</p>
                  <div className="flex gap-1 flex-wrap mt-1.5">
                    {w.events.map(ev => (
                      <span key={ev} className="text-[10px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded font-medium">{ev}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => testWebhook(w.id)}
                    disabled={testingId === w.id}
                    title="Send test"
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {testingId === w.id ? <RefreshCw size={13} className="animate-spin" /> : <FlaskConical size={13} />}
                  </button>
                  <button onClick={() => startEdit(w)} title="Edit" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this webhook?')) deleteMutation.mutate(w.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Secret row */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-400 font-medium flex-shrink-0">Secret</span>
                <span className="text-xs font-mono text-gray-700 flex-1 truncate">
                  {revealSecret === w.id ? w.secret : '••••••••••••••••••••••••'}
                </span>
                <button onClick={() => setRevealSecret(revealSecret === w.id ? null : w.id)} className="text-gray-400 hover:text-gray-600">
                  {revealSecret === w.id ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(w.secret); toast.success('Secret copied'); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Copy size={12} />
                </button>
                <button
                  onClick={() => { if (confirm('Rotate secret? Update your endpoint to use the new value.')) rotateMutation.mutate(w.id); }}
                  title="Rotate secret"
                  className="text-gray-400 hover:text-amber-600"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification docs */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-700 text-sm mb-2">Verifying signatures</p>
        <p>Each request includes <code className="bg-gray-200 px-1 rounded">X-Agency-Signature: sha256=&lt;hex&gt;</code></p>
        <p>Compute: <code className="bg-gray-200 px-1 rounded">HMAC-SHA256(secret, "{"{timestamp}"}.{"{body}"}")</code></p>
        <p>Also sent: <code className="bg-gray-200 px-1 rounded">X-Agency-Timestamp</code> and <code className="bg-gray-200 px-1 rounded">X-Agency-Event</code></p>
      </div>
    </div>
  );
}

// ── My Profile Tab ─────────────────────────────────────────────────────────────
const profileSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Valid email required'),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).superRefine((d, ctx) => {
  if (d.newPassword) {
    if (d.newPassword.length < 8) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Min 8 characters', path: ['newPassword'] });
    if (!d.currentPassword) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Current password required', path: ['currentPassword'] });
    if (d.newPassword !== d.confirmPassword) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Passwords do not match', path: ['confirmPassword'] });
  }
});
type ProfileForm = z.infer<typeof profileSchema>;

function ProfileTab() {
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '', currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: ProfileForm) => api.put<{ data: { id: string; email: string; name: string; role: never } }>('/profile', {
      name: data.name,
      email: data.email,
      ...(data.newPassword ? { currentPassword: data.currentPassword, newPassword: data.newPassword } : {}),
    }),
    onSuccess: (res) => {
      setUser({ ...user!, name: res.data.name, email: res.data.email });
      reset({ name: res.data.name, email: res.data.email, currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Profile updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update profile'),
  });

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-8">
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">Account Info</h3>
        <div>
          <label className="label">Full Name</label>
          <input {...register('name')} className="input" />
          {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Email Address</label>
          <input {...register('email')} type="email" className="input" />
          {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">Change Password</h3>
        <p className="text-xs text-gray-400">Leave blank to keep your current password.</p>
        <div>
          <label className="label">Current Password</label>
          <div className="relative">
            <input {...register('currentPassword')} type={showCurrent ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" />
            <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.currentPassword && <p className="text-red-600 text-xs mt-1">{errors.currentPassword.message}</p>}
        </div>
        <div>
          <label className="label">New Password</label>
          <div className="relative">
            <input {...register('newPassword')} type={showNew ? 'text' : 'password'} className="input pr-10" placeholder="Min 8 characters" />
            <button type="button" onClick={() => setShowNew(v => !v)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.newPassword && <p className="text-red-600 text-xs mt-1">{errors.newPassword.message}</p>}
        </div>
        <div>
          <label className="label">Confirm New Password</label>
          <input {...register('confirmPassword')} type="password" className="input" placeholder="••••••••" />
          {errors.confirmPassword && <p className="text-red-600 text-xs mt-1">{errors.confirmPassword.message}</p>}
        </div>
      </div>

      {mutation.isError && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{(mutation.error as Error).message}</div>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={!isDirty || mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Saving...' : 'Save Profile'}
        </button>
        {mutation.isSuccess && <span className="flex items-center gap-1 text-green-600 text-sm"><Check size={16} /> Saved</span>}
      </div>
    </form>
  );
}

// ── Alerts Tab ─────────────────────────────────────────────────────────────────
function AlertsTab() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const runAlerts = async () => {
    setRunning(true);
    setResults([]);
    try {
      const res = await api.post<{ message: string; results: string[] }>('/analytics/alerts/run', {});
      setResults(res.results ?? []);
      toast.success('Alerts run complete');
    } catch {
      toast.error('Failed to run alerts — check SMTP configuration');
    } finally {
      setRunning(false);
    }
  };

  const alertTypes = [
    {
      icon: FileText,
      color: 'bg-amber-50 text-amber-600',
      title: 'Pending Approval Digest',
      desc: 'Sent to all Owners and Account Managers when posts have been waiting for approval for over 24 hours.',
    },
    {
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600',
      title: 'Overdue Action Items',
      desc: 'Sent to all Owners and Account Managers listing every action item that is past its due date.',
    },
    {
      icon: Clock,
      color: 'bg-blue-50 text-blue-600',
      title: 'Invoice Overdue Alert',
      desc: 'Sent to the Owner when sent invoices pass their due date. Invoices are automatically marked OVERDUE.',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-800 mb-1">Smart Alert Emails</h3>
        <p className="text-sm text-gray-500">
          Automated daily emails keep your team on top of things that need attention — no manual checking required.
        </p>
      </div>

      {/* Schedule info */}
      <div className="flex items-start gap-3 p-4 bg-primary-50 border border-primary-100 rounded-xl">
        <Clock size={16} className="text-primary-700 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-primary-800">Automatic schedule</p>
          <p className="text-primary-700 mt-0.5">
            Alert checks run every day at <strong>9:00 AM IST</strong>. Monthly performance reports are sent to clients on the <strong>1st of each month at 8:00 AM IST</strong> (requires Monthly schedule enabled per client in Client Settings).
          </p>
        </div>
      </div>

      {/* Alert types */}
      <div className="space-y-3">
        {alertTypes.map(alert => {
          const Icon = alert.icon;
          return (
            <div key={alert.title} className="flex items-start gap-3 p-4 border border-gray-100 rounded-xl">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${alert.color}`}>
                <Icon size={15} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{alert.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{alert.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual trigger */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm text-gray-600 mb-3">
          Run all alert checks right now — useful for testing SMTP configuration or catching up on a missed day.
        </p>
        <button
          onClick={runAlerts}
          disabled={running}
          className="btn-primary flex items-center gap-2 disabled:opacity-60"
        >
          {running ? <RefreshCw size={15} className="animate-spin" /> : <Bell size={15} />}
          {running ? 'Running…' : 'Run Alerts Now'}
        </button>

        {results.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Check size={13} className="text-green-600 flex-shrink-0" />
                <span className="text-gray-700">{r}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ClientDigestCard />
    </div>
  );
}

function ClientDigestCard() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; total: number; errors: string[] } | null>(null);

  async function sendDigests() {
    setSending(true);
    setResult(null);
    try {
      const res = await api.post<{ message: string; errors: string[] }>('/digest/email-clients', {});
      const match = res.message.match(/(\d+)\/(\d+)/);
      setResult({ sent: match ? parseInt(match[1]) : 0, total: match ? parseInt(match[2]) : 0, errors: res.errors ?? [] });
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to send digests');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-800">Per-Client Weekly Digest</h3>
        <p className="text-sm text-gray-500 mt-1">
          Sends a personalised weekly update email to each active client's contact email — posts published, audits completed, action items done, plus AI-generated highlights and next steps.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
        Only clients with a contact email set (in Overview tab) will receive the digest. The digest also runs automatically every Sunday at 8 PM IST.
      </div>

      <button
        onClick={sendDigests}
        disabled={sending}
        className="btn-secondary flex items-center gap-2"
      >
        {sending ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
        {sending ? 'Sending…' : 'Send Client Digests Now'}
      </button>

      {result && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700">Sent {result.sent} of {result.total} client digest{result.total !== 1 ? 's' : ''}</p>
          {result.errors.map((e, i) => (
            <p key={i} className="text-xs text-red-500">{e}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
type Tab = 'branding' | 'api-keys' | 'team' | 'webhooks' | 'profile' | 'alerts';

export default function Settings() {
  const user = useAuthStore(s => s.user);
  const location = useLocation();
  const initialTab = (location.state as { tab?: Tab } | null)?.tab ?? 'branding';
  const [tab, setTab] = useState<Tab>(initialTab);
  const isOwner = user?.role === 'OWNER';

  const { data, isLoading } = useQuery({
    queryKey: ['agency'],
    queryFn: () => api.get<{ data: Agency }>('/agency'),
  });
  const agency = data?.data;

  if (isLoading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-800 rounded-full" /></div>;
  if (!agency) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">{agency.name}</p>
      </div>

      {!isOwner && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          You have read-only access to settings. Contact your agency owner to make changes.
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <TabButton active={tab === 'branding'} onClick={() => setTab('branding')} icon={Building2} label="Branding" />
        <TabButton active={tab === 'api-keys'} onClick={() => setTab('api-keys')} icon={Key} label="API Keys" />
        <TabButton active={tab === 'team'} onClick={() => setTab('team')} icon={Users} label="Team" />
        <TabButton active={tab === 'webhooks'} onClick={() => setTab('webhooks')} icon={Webhook} label="Webhooks" />
        <TabButton active={tab === 'alerts'} onClick={() => setTab('alerts')} icon={Bell} label="Alerts" />
        <TabButton active={tab === 'profile'} onClick={() => setTab('profile')} icon={UserCircle} label="My Profile" />
      </div>

      <div className="card p-6">
        {tab === 'branding'  && (isOwner ? <BrandingTab agency={agency} /> : <p className="text-gray-500">Owner access required.</p>)}
        {tab === 'api-keys'  && (isOwner ? <ApiKeysTab agency={agency} /> : <p className="text-gray-500">Owner access required.</p>)}
        {tab === 'team'      && <TeamTab />}
        {tab === 'webhooks'  && (isOwner ? <WebhooksTab /> : <p className="text-gray-500">Owner access required.</p>)}
        {tab === 'alerts'    && (isOwner ? <AlertsTab /> : <p className="text-gray-500">Owner access required.</p>)}
        {tab === 'profile'   && <ProfileTab />}
      </div>
    </div>
  );
}
