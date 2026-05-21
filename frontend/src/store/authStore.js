// frontend/src/store/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (token, user) => set({ token, user, isAuthenticated: true }),

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        localStorage.removeItem('auth-storage');
      },

      updateUser: (userData) => set({ user: { ...get().user, ...userData } }),

      hasRole: (...roles) => roles.includes(get().user?.role),
    }),
    { name: 'auth-storage' }
  )
);

export default useAuthStore;
