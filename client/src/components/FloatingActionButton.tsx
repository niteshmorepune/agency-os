import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, X, PenSquare, ClipboardList, Receipt } from 'lucide-react';
import { api } from '../api/client';

interface Client { id: string; name: string }

const actionItemSchema = z.object({
  clientId: z.string().min(1, 'Select a client'),
  title: z.string().min(1).max(300),
  dueDate: z.string().optional(),
});
type ActionItemForm = z.infer<typeof actionItemSchema>;

function ActionItemModal({ onClose }: { onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ data: Client[] }>('/clients'),
    staleTime: 60_000,
  });
  const clients = (data?.data ?? []).filter((c: Client & { status?: string }) => (c as Client & { status: string }).status === 'ACTIVE');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ActionItemForm>({
    resolver: zodResolver(actionItemSchema),
  });

  async function onSubmit(form: ActionItemForm) {
    await api.post(`/clients/${form.clientId}/action-items`, {
      title: form.title,
      dueDate: form.dueDate || undefined,
    });
    toast.success('Action item created');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><ClipboardList size={16} /> New Action Item</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="label">Client</label>
            <select {...register('clientId')} className="input">
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId.message}</p>}
          </div>
          <div>
            <label className="label">Title</label>
            <input {...register('title')} className="input" placeholder="e.g. Update Google Business profile" autoFocus />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="label">Due Date <span className="text-gray-400">(optional)</span></label>
            <input {...register('dueDate')} type="date" className="input" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={isSubmitting} className="btn-primary text-sm flex-1">
              {isSubmitting ? 'Creating…' : 'Create'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ACTIONS = [
  { id: 'post', label: 'New Post', icon: PenSquare, color: 'bg-primary-700 hover:bg-primary-800 text-white' },
  { id: 'action-item', label: 'Action Item', icon: ClipboardList, color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  { id: 'invoice', label: 'New Invoice', icon: Receipt, color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
];

export default function FloatingActionButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<'action-item' | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  function handleAction(id: string) {
    setOpen(false);
    if (id === 'post') navigate('/content/new');
    else if (id === 'action-item') setModal('action-item');
    else if (id === 'invoice') navigate('/invoices');
  }

  return (
    <>
      <div ref={ref} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {/* Action buttons — slide up when open */}
        <div className={`flex flex-col items-end gap-2 transition-all duration-200 ${open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          {ACTIONS.map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium transition-all ${action.color}`}
              >
                <Icon size={16} />
                {action.label}
              </button>
            );
          })}
        </div>

        {/* Main FAB */}
        <button
          onClick={() => setOpen(v => !v)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ${open ? 'bg-gray-800 hover:bg-gray-900 rotate-45' : 'bg-primary-800 hover:bg-primary-900'} text-white`}
          aria-label={open ? 'Close quick add' : 'Quick add'}
        >
          <Plus size={24} className={`transition-transform duration-200 ${open ? 'rotate-45' : 'rotate-0'}`} />
        </button>
      </div>

      {modal === 'action-item' && <ActionItemModal onClose={() => setModal(null)} />}
    </>
  );
}
