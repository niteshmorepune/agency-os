import { create } from 'zustand';
import { Role } from '@agencyos/shared';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  agencyId: string;
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null }),
}));
