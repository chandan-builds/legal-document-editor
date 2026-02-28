import { create } from 'zustand';
import { User } from '@/types';

interface AppState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  trackChanges: boolean;
  toggleTrackChanges: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  trackChanges: false,
  toggleTrackChanges: () => set((state) => ({ trackChanges: !state.trackChanges })),
}));
