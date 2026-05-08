import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock, Check } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';

const profileSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  email: z.string().email('Valid email required'),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
type PasswordForm = z.infer<typeof passwordSchema>;

export default function Profile() {
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const qc = useQueryClient();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register: regProfile, handleSubmit: handleProfile, formState: { errors: profileErrors, isDirty: profileDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  const { register: regPwd, handleSubmit: handlePwd, reset: resetPwd, formState: { errors: pwdErrors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileForm) => api.patch<{ data: typeof user }>('/auth/profile', data),
    onSuccess: (res) => {
      if (res.data) setUser(res.data as never);
      qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update profile'),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) =>
      api.patch('/auth/profile', { currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => { resetPwd(); toast.success('Password changed successfully'); },
    onError: (err: Error) => toast.error(err.message || 'Failed to change password'),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">Update your personal details and password</p>
      </div>

      {/* Avatar + role display */}
      <div className="card p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <span className="text-primary-800 font-bold text-2xl">{user?.name?.[0]?.toUpperCase() ?? '?'}</span>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-800 font-medium">{user?.role}</span>
        </div>
      </div>

      {/* Profile details */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-5"><User size={16} /> Personal Details</h2>
        <form onSubmit={handleProfile(d => profileMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input {...regProfile('name')} className="input" />
            {profileErrors.name && <p className="text-red-600 text-xs mt-1">{profileErrors.name.message}</p>}
          </div>
          <div>
            <label className="label">Email Address</label>
            <input {...regProfile('email')} type="email" className="input" />
            {profileErrors.email && <p className="text-red-600 text-xs mt-1">{profileErrors.email.message}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={!profileDirty || profileMutation.isPending} className="btn-primary">
              {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            {profileMutation.isSuccess && <span className="flex items-center gap-1 text-green-600 text-sm"><Check size={16} /> Saved</span>}
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-5"><Lock size={16} /> Change Password</h2>
        <form onSubmit={handlePwd(d => passwordMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <div className="relative">
              <input {...regPwd('currentPassword')} type={showCurrent ? 'text' : 'password'} className="input pr-10" />
              <button type="button" onClick={() => setShowCurrent(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {pwdErrors.currentPassword && <p className="text-red-600 text-xs mt-1">{pwdErrors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input {...regPwd('newPassword')} type={showNew ? 'text' : 'password'} className="input pr-10" />
              <button type="button" onClick={() => setShowNew(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {pwdErrors.newPassword && <p className="text-red-600 text-xs mt-1">{pwdErrors.newPassword.message}</p>}
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <div className="relative">
              <input {...regPwd('confirmPassword')} type={showConfirm ? 'text' : 'password'} className="input pr-10" />
              <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {pwdErrors.confirmPassword && <p className="text-red-600 text-xs mt-1">{pwdErrors.confirmPassword.message}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={passwordMutation.isPending} className="btn-primary">
              {passwordMutation.isPending ? 'Updating...' : 'Change Password'}
            </button>
            {passwordMutation.isSuccess && <span className="flex items-center gap-1 text-green-600 text-sm"><Check size={16} /> Updated</span>}
            {passwordMutation.isError && <span className="text-red-600 text-sm">{(passwordMutation.error as Error).message}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
