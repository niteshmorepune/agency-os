import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  selectedClientId: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedClient: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  selectedClientId: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSelectedClient: (selectedClientId) => set({ selectedClientId }),
}));
