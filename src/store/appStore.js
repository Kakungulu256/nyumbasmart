import { create } from 'zustand'

export const useAppStore = create((set) => ({
  user: null,
  role: null,
  notificationCount: 0,
  searchFilters: {
    keyword: '',
    city: '',
    minRent: null,
    maxRent: null,
  },
  setUser: (user) => set(() => ({ user })),
  setRole: (role) => set(() => ({ role })),
  setNotificationCount: (count) => set(() => ({ notificationCount: count })),
  updateSearchFilters: (partial) =>
    set((state) => ({
      searchFilters: { ...state.searchFilters, ...partial },
    })),
}))
