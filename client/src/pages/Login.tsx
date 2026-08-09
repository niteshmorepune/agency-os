import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

type FormData = z.infer<typeof schema>;

// Shown when a client arrives here after a failed single-sign-on redirect
// from the NEDS CRM portal (see server/src/routes/sso.routes.ts) — every
// failure lands on this page with an `sso_error` code instead of a bare
// JSON error, so there's always a plain-English explanation and a way to
// still sign in manually.
const SSO_ERROR_MESSAGES: Record<string, string> = {
  no_access: "You don't have access to this dashboard yet. Please contact NEDS support to get connected.",
  expired: 'Your sign-in link expired. Please return to the client portal and click the link again.',
  missing_token: 'That sign-in link looks incomplete. Please return to the client portal and try again.',
  not_configured: 'Single sign-on is temporarily unavailable. Please sign in with your email and password below, or contact support.',
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useAuthStore(s => s.setUser);
  const ssoErrorCode = searchParams.get('sso_error');
  const [error, setError] = useState(
    ssoErrorCode ? (SSO_ERROR_MESSAGES[ssoErrorCode] ?? 'Single sign-on failed. Please sign in below.') : ''
  );
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const res = await api.post<{ user: { id: string; email: string; name: string; role: never; agencyId: string } }>('/auth/login', data);
      setUser(res.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Niranjan Enterprises Digital Solutions" className="mx-auto mb-4 w-48 h-auto drop-shadow-lg" />
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input {...register('email')} type="email" className="input" placeholder="you@agency.com" autoComplete="email" />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input {...register('password')} type={showPassword ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="text-center text-primary-300 text-sm mt-4">Niranjan Enterprises Digital Solutions — Internal Platform</p>
      </div>
    </div>
  );
}
