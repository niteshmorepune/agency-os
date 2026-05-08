import { useState, useEffect, KeyboardEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, X, RefreshCw, CheckCircle, XCircle, Hash, Image, LayoutTemplate, BookMarked, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import MediaPicker from '../components/MediaPicker';
import { useAuthStore } from '../store/auth.store';
import { Role } from '@agencyos/shared';

interface ClientBasic {
  id: string;
  name: string;
  status: string;
}

interface PostDraft {
  id: string;
  clientId: string;
  platforms: string[];
  caption: string;
  hashtags: string[];
  mediaUrls: string[];
  scheduledAt: string | null;
  status: string;
  approvalStatus: string;
  aiGenerated: boolean;
  notes: string;
  createdBy: { name: string; avatarUrl: string | null };
}

const PLATFORMS = [
  { key: 'LINKEDIN',   label: 'LinkedIn',    bg: 'bg-blue-600',   limit: 3000 },
  { key: 'INSTAGRAM',  label: 'Instagram',   bg: 'bg-pink-500',   limit: 2200 },
  { key: 'FACEBOOK',   label: 'Facebook',    bg: 'bg-blue-500',   limit: 63206 },
  { key: 'TWITTER',    label: 'X / Twitter', bg: 'bg-sky-500',    limit: 280 },
  { key: 'TIKTOK',     label: 'TikTok',      bg: 'bg-gray-800',   limit: 2200 },
  { key: 'YOUTUBE',    label: 'YouTube',     bg: 'bg-red-600',    limit: 5000 },
  { key: 'PINTEREST',  label: 'Pinterest',   bg: 'bg-red-500',    limit: 500 },
  { key: 'GOOGLE_ADS', label: 'Google Ads',  bg: 'bg-yellow-500', limit: 90 },
  { key: 'EMAIL',      label: 'Email',       bg: 'bg-purple-600', limit: 5000 },
  { key: 'WHATSAPP',   label: 'WhatsApp',    bg: 'bg-green-500',  limit: 4096 },
  { key: 'GBP',        label: 'Google Biz',  bg: 'bg-green-600',  limit: 1500 },
];

const schema = z.object({
  clientId: z.string().min(1, 'Select a client'),
  platforms: z.array(z.string()).min(1, 'Select at least one platform'),
  caption: z.string().min(1, 'Caption is required').max(5000),
  notes: z.string().max(2000).optional(),
  scheduledAt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ContentComposer() {
  const { postId } = useParams<{ postId?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isEdit = !!postId;

  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashInput, setHashInput] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showHashtagSets, setShowHashtagSets] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { clientId: '', platforms: [], caption: '', notes: '', scheduledAt: '' },
  });

  const selectedClientId = watch('clientId');
  const caption = watch('caption');
  const selectedPlatforms = watch('platforms');

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ data: ClientBasic[] }>('/clients'),
    staleTime: 60_000,
  });
  const clients = (clientsData?.data ?? []).filter(c => c.status === 'ACTIVE');

  const { data: postData } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => api.get<{ data: PostDraft }>(`/posts/${postId}`),
    enabled: isEdit,
  });

  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get<{ data: { id: string; name: string; platform: string | null; caption: string; hashtags: string[] }[] }>('/templates'),
    staleTime: 60_000,
  });

  const { data: hashtagSetsData } = useQuery({
    queryKey: ['hashtag-sets', selectedClientId, selectedPlatforms[0]],
    queryFn: () => api.get<{ data: { id: string; topic: string; hashtags: string[] }[] }>(
      `/hashtags?clientId=${selectedClientId}${selectedPlatforms[0] ? `&platform=${selectedPlatforms[0]}` : ''}`
    ),
    enabled: !!selectedClientId && showHashtagSets,
  });

  useEffect(() => {
    if (postData?.data) {
      const p = postData.data;
      reset({
        clientId: p.clientId,
        platforms: p.platforms,
        caption: p.caption,
        notes: p.notes,
        scheduledAt: p.scheduledAt ? p.scheduledAt.slice(0, 16) : '',
      });
      setHashtags(p.hashtags ?? []);
      setMediaUrls(p.mediaUrls ?? []);
    }
  }, [postData, reset]);

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<{ data: PostDraft }>('/posts', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['posts'] }); toast.success('Post saved'); navigate('/content'); },
    onError: () => toast.error('Failed to save post'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.put<{ data: PostDraft }>(`/posts/${postId}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['posts'] }); toast.success('Post updated'); navigate('/content'); },
    onError: () => toast.error('Failed to update post'),
  });

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/posts/${postId}/approve`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['post', postId] }); toast.success('Post approved'); },
    onError: () => toast.error('Failed to approve post'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/posts/${postId}/reject`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['post', postId] }); toast.success('Post sent back for revision'); },
    onError: () => toast.error('Failed to reject post'),
  });

  const saveAsTemplate = async () => {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    try {
      await api.post('/templates', {
        name: templateName.trim(),
        platform: selectedPlatforms[0] ?? null,
        caption: watch('caption'),
        hashtags,
      });
      qc.invalidateQueries({ queryKey: ['templates'] });
      setTemplateName('');
      toast.success('Template saved');
    } catch {
      toast.error('Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const onSubmit = (values: FormValues, asDraft = true) => {
    const payload: Record<string, unknown> = {
      ...values,
      hashtags,
      mediaUrls,
      scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : null,
      status: asDraft ? 'DRAFT' : 'SCHEDULED',
    };
    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const generateCaption = async () => {
    if (!caption && !selectedClientId) return;
    setAiLoading(true);
    setAiError('');
    try {
      const platform = selectedPlatforms[0] ?? 'LinkedIn';
      const res = await api.post<{ data: string }>('/ai/caption', {
        topic: caption || 'Generate a compelling social media caption',
        platform,
        clientId: selectedClientId || undefined,
      });
      setValue('caption', res.data, { shouldDirty: true });
    } catch {
      setAiError('AI generation failed. Try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const addHashtag = (val: string) => {
    const tag = val.replace(/^#/, '').trim().replace(/\s+/g, '');
    if (tag && !hashtags.includes(tag)) setHashtags(h => [...h, tag]);
    setHashInput('');
  };

  const handleHashKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addHashtag(hashInput);
    }
  };

  const post = postData?.data;
  const canApprove = user?.role === Role.OWNER || user?.role === Role.ACCOUNT_MANAGER;
  const strictestLimit = selectedPlatforms.length > 0
    ? Math.min(...selectedPlatforms.map(p => PLATFORMS.find(pl => pl.key === p)?.limit ?? 5000))
    : 5000;
  const charCount = caption.length;
  const overLimit = charCount > strictestLimit;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/content" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 flex-shrink-0">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-0.5">
            <Link to="/content" className="hover:text-primary-600">Content Studio</Link>
            <span>/</span>
            <span>{isEdit ? 'Edit Post' : 'New Post'}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Post' : 'Compose Post'}</h1>
        </div>
      </div>

      {/* Approval bar (edit mode only) */}
      {isEdit && post && canApprove && (
        <div className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
          post.approvalStatus === 'PENDING' ? 'bg-yellow-50 border border-yellow-200' :
          post.approvalStatus === 'APPROVED' ? 'bg-green-50 border border-green-200' :
          'bg-red-50 border border-red-200'
        }`}>
          <span className="text-sm font-medium text-gray-700">
            Approval: <span className="capitalize">{post.approvalStatus.toLowerCase()}</span>
          </span>
          {post.approvalStatus === 'PENDING' && (
            <div className="flex gap-2">
              <button onClick={() => approveMutation.mutate()} className="flex items-center gap-1.5 btn-primary text-xs py-1.5 px-3 bg-green-700 hover:bg-green-800">
                <CheckCircle size={13} /> Approve
              </button>
              <button onClick={() => rejectMutation.mutate()} className="flex items-center gap-1.5 btn-secondary text-xs py-1.5 px-3 text-red-600 border-red-200 hover:bg-red-50">
                <XCircle size={13} /> Reject
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(v => onSubmit(v))} className="space-y-5">
        {/* Client */}
        <div>
          <label className="label">Client <span className="text-red-400">*</span></label>
          <select className={`input ${errors.clientId ? 'border-red-300' : ''}`} {...register('clientId')}>
            <option value="">Select client...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId.message}</p>}
        </div>

        {/* Platforms */}
        <div>
          <label className="label">Platforms <span className="text-red-400">*</span></label>
          <Controller
            name="platforms"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => {
                  const selected = field.value.includes(p.key);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        if (selected) field.onChange(field.value.filter(v => v !== p.key));
                        else field.onChange([...field.value, p.key]);
                      }}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                        selected
                          ? `${p.bg} text-white border-transparent`
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {errors.platforms && <p className="text-red-500 text-xs mt-1">{errors.platforms.message}</p>}
        </div>

        {/* Caption */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <label className="label mb-0">Caption <span className="text-red-400">*</span></label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTemplatePicker(v => !v)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <LayoutTemplate size={11} /> Templates
                </button>
                {showTemplatePicker && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-600">Pick a template</p>
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      {(templatesData?.data ?? []).length === 0 ? (
                        <p className="text-xs text-gray-400 px-3 py-4 text-center">No templates saved yet</p>
                      ) : (
                        (templatesData?.data ?? []).map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setValue('caption', t.caption, { shouldDirty: true });
                              if (t.hashtags?.length) setHashtags(t.hashtags);
                              setShowTemplatePicker(false);
                              toast.success(`Template "${t.name}" loaded`);
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <p className="text-xs font-medium text-gray-800">{t.name}</p>
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">{t.caption.slice(0, 60)}…</p>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="px-3 py-2 border-t border-gray-100 flex gap-2 items-center">
                      <input
                        value={templateName}
                        onChange={e => setTemplateName(e.target.value)}
                        placeholder="Save current as template…"
                        className="input text-xs py-1.5 flex-1"
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveAsTemplate(); } }}
                      />
                      <button type="button" onClick={saveAsTemplate} disabled={!templateName.trim() || savingTemplate} className="btn-primary text-xs py-1.5 px-3">
                        {savingTemplate ? '…' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${overLimit ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                {charCount} / {strictestLimit}
              </span>
              <button
                type="button"
                onClick={generateCaption}
                disabled={aiLoading}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors font-medium disabled:opacity-60"
              >
                {aiLoading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                AI Generate
              </button>
            </div>
          </div>
          <textarea
            className={`input min-h-[120px] resize-none ${errors.caption || overLimit ? 'border-red-300' : ''}`}
            placeholder="Write your caption here, or click AI Generate to create one..."
            {...register('caption')}
          />
          {aiError && <p className="text-red-500 text-xs mt-1">{aiError}</p>}
          {errors.caption && <p className="text-red-500 text-xs mt-1">{errors.caption.message}</p>}
        </div>

        {/* Hashtags */}
        <div>
          <label className="label">Hashtags</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {hashtags.map(tag => (
              <span key={tag} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                <Hash size={10} className="text-gray-400" />
                {tag}
                <button type="button" onClick={() => setHashtags(h => h.filter(t => t !== tag))} className="ml-0.5 text-gray-400 hover:text-red-500">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            className="input"
            placeholder="Type a hashtag and press Enter..."
            value={hashInput}
            onChange={e => setHashInput(e.target.value)}
            onKeyDown={handleHashKey}
            onBlur={() => { if (hashInput.trim()) addHashtag(hashInput); }}
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-400">{hashtags.length} hashtag{hashtags.length !== 1 ? 's' : ''} · Press Enter or comma to add</p>
            {selectedClientId && (
              <button
                type="button"
                onClick={() => setShowHashtagSets(v => !v)}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
              >
                <BookMarked size={11} /> {showHashtagSets ? 'Hide sets' : 'Load from saved sets'}
              </button>
            )}
          </div>
          {showHashtagSets && selectedClientId && (
            <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs font-medium text-gray-600 mb-2">Saved Hashtag Sets</p>
              {(hashtagSetsData?.data ?? []).length === 0 ? (
                <p className="text-xs text-gray-400">No saved sets for this client/platform yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(hashtagSetsData?.data ?? []).map(set => (
                    <button
                      key={set.id}
                      type="button"
                      onClick={() => {
                        const toAdd = (set.hashtags as string[]).filter(t => !hashtags.includes(t));
                        setHashtags(h => [...h, ...toAdd]);
                        toast.success(`Added ${toAdd.length} hashtags from "${set.topic}"`);
                      }}
                      className="text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-700 hover:border-primary-300 hover:text-primary-700 transition-colors"
                    >
                      {set.topic} <span className="text-gray-400">({(set.hashtags as string[]).length})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Media */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Media</label>
            <button
              type="button"
              onClick={() => selectedClientId ? setShowMediaPicker(true) : toast.error('Select a client first')}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors font-medium"
            >
              <Image size={12} /> Add from Library
            </button>
          </div>
          {mediaUrls.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {mediaUrls.map(url => (
                <div key={url} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                  {url.match(/\.(mp4|mov|webm)$/i) ? (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center text-gray-400 text-xs">Video</div>
                  ) : (
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => setMediaUrls(prev => prev.filter(u => u !== url))}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={10} className="text-white" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400">No media attached · click "Add from Library" to attach images or videos</p>
          )}
        </div>

        {/* Schedule */}
        <div>
          <label className="label">Schedule Date & Time (optional)</label>
          <input
            type="datetime-local"
            className="input"
            {...register('scheduledAt')}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="label">Internal Notes (optional)</label>
          <textarea
            className="input min-h-[60px] resize-none"
            placeholder="Notes for the team — not visible to clients..."
            {...register('notes')}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : null}
            {isEdit ? 'Save Changes' : 'Save as Draft'}
          </button>
          {!isEdit && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit(v => onSubmit(v, false))}
              className="btn-secondary"
            >
              Save & Schedule
            </button>
          )}
          <Link to="/content" className="btn-secondary ml-auto">Cancel</Link>
        </div>
      </form>

      {showMediaPicker && selectedClientId && (
        <MediaPicker
          clientId={selectedClientId}
          selected={mediaUrls}
          onConfirm={urls => setMediaUrls(urls)}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </div>
  );
}
