import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import { Building2, Key, Users, Eye, EyeOff, Plus, Check, X, Pencil } from 'lucide-react';

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
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-6 max-w-2xl">
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
    <form onSubmit={handleSubmit(d => keysMutation.mutate(d))} className="space-y-8 max-w-2xl">
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

  return (
    <div className="space-y-6 max-w-3xl">
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
                  <button
                    onClick={() => toggleMutation.mutate({ id: u.id, isActive: u.isActive })}
                    className={`text-xs font-medium ${u.isActive ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                  >
                    {u.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
type Tab = 'branding' | 'api-keys' | 'team';

export default function Settings() {
  const user = useAuthStore(s => s.user);
  const [tab, setTab] = useState<Tab>('branding');
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
      </div>

      <div className="card p-6">
        {tab === 'branding'  && (isOwner ? <BrandingTab agency={agency} /> : <p className="text-gray-500">Owner access required.</p>)}
        {tab === 'api-keys'  && (isOwner ? <ApiKeysTab agency={agency} /> : <p className="text-gray-500">Owner access required.</p>)}
        {tab === 'team'      && <TeamTab />}
      </div>
    </div>
  );
}
