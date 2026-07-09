import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';

interface InviteInfo { name: string; email: string; role: string }

const schema = z.object({
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });
type FormData = z.infer<typeof schema>;

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const setUser = useAuthStore(s => s.setUser);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    api.get<{ data: InviteInfo }>(`/invite/${token}`)
      .then(r => setInvite(r.data))
      .catch(e => setLoadError(e instanceof Error ? e.message : 'Invalid or expired invite link'))
      .finally(() => setLoading(false));
  }, [token]);

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post<{ user: { id: string; email: string; name: string; role: never; agencyId: string } }>(`/invite/${token}`, { password: data.password });
      setUser(res.user);
      navigate(res.user.role === 'CLIENT' ? '/portal' : '/dashboard');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not set your password. Try requesting a new invite.');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-gray-400" size={32} />
    </div>
  );

  if (!invite) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Invite unavailable</h2>
        <p className="text-gray-500 text-sm">{loadError}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Niranjan Enterprises Digital Solutions" className="mx-auto mb-4 w-48 h-auto drop-shadow-lg" />
        </div>
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900">Welcome, {invite.name}</h2>
          <p className="text-gray-500 text-sm mt-1 mb-6">Set a password for {invite.email} to finish setting up your account.</p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input {...register('password')} type={showPassword ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="label">Confirm password</label>
              <input {...register('confirmPassword')} type={showPassword ? 'text' : 'password'} className="input" placeholder="••••••••" autoComplete="new-password" />
              {errors.confirmPassword && <p className="text-red-600 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>
            {loadError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{loadError}</div>
            )}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
              {isSubmitting ? 'Setting password...' : 'Set Password & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
