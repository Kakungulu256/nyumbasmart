import { create } from 'zustand'

export const useAppStore = create((set) => ({
  authStatus: 'loading',
  user: null,
  profile: null,
  role: null,
  notificationCount: 0,
  searchFilters: {
    keyword: '',
    city: '',
    minRent: null,
    maxRent: null,
  },
  setAuthStatus: (authStatus) => set(() => ({ authStatus })),
  setSession: ({ user, profile }) =>
    set(() => ({
      user,
      profile,
      role: profile?.role ?? null,
    })),
  clearSession: () =>
    set(() => ({
      user: null,
      profile: null,
      role: null,
    })),
  setUser: (user) => set(() => ({ user })),
  setProfile: (profile) =>
    set(() => ({
      profile,
      role: profile?.role ?? null,
    })),
  setRole: (role) => set(() => ({ role })),
  setNotificationCount: (count) => set(() => ({ notificationCount: count })),
  updateSearchFilters: (partial) =>
    set((state) => ({
      searchFilters: { ...state.searchFilters, ...partial },
    })),
}))
