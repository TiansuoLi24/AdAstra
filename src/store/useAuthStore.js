import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loginAPI, registerAPI, getMeAPI } from '../services/authService'
import { listMapsAPI, syncMapsAPI, getSettingsAPI, saveSettingsAPI } from '../services/apiService'
import useTaskStore from './useTaskStore'
import useSettingsStore from './useSettingsStore'

async function loadUserData(token) {
  // Load maps from server
  try {
    const { maps } = await listMapsAPI(token)
    if (maps.length > 0) {
      // Server has data — load each map with full tasks
      const fullMaps = []
      const { getMapAPI } = await import('../services/apiService')
      for (const m of maps) {
        try {
          const { map } = await getMapAPI(token, m.id)
          fullMaps.push({
            id: map.id,
            name: map.name,
            tasks: map.tasks,
            createdAt: new Date(map.createdAt).getTime(),
          })
        } catch {
          // Skip maps that fail to load
        }
      }
      if (fullMaps.length > 0) {
        // Ensure every map has a valid tasks tree
        for (const m of fullMaps) {
          if (!m.tasks || typeof m.tasks !== 'object') {
            m.tasks = {
              id: 'root',
              label: m.name,
              status: 'pending',
              children: [],
            }
          }
        }
        useTaskStore.getState().loadFromServer(fullMaps)
      }
    } else {
      // No server data — upload local data to server
      const localMaps = useTaskStore.getState().maps
      if (localMaps && localMaps.length > 0) {
        try {
          await syncMapsAPI(token, localMaps)
        } catch {
          // Upload failed, continue with local data
        }
      }
    }
  } catch {
    // Server unreachable, keep local data
  }

  // Load settings from server
  try {
    const { settings } = await getSettingsAPI(token)
    if (settings && Object.keys(settings).length > 0) {
      useSettingsStore.getState().loadFromServer(settings)
    } else {
      // No server settings — upload local settings
      const localSettings = { ...useSettingsStore.getState() }
      const dataKeys = [
        'planetOrbitSpeed', 'moonOrbitSpeed', 'starRotationSpeed',
        'starType', 'enableMeteors', 'enableAsteroidBelt', 'enableSpaceDust',
        'enableNebula', 'enableStarBackground', 'bloomIntensity',
        'starCount', 'meteorCount', 'showOrbitLines', 'orbitLineOpacity',
      ]
      const settingsData = {}
      dataKeys.forEach((k) => { settingsData[k] = localSettings[k] })
      try {
        await saveSettingsAPI(token, settingsData)
      } catch {
        // Upload failed, continue with local
      }
    }
  } catch {
    // Server unreachable, keep local
  }
}

const useAuthStore = create(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoginModalOpen: false,

      openLoginModal: () => set({ isLoginModalOpen: true }),

      closeLoginModal: () => set({ isLoginModalOpen: false }),

      login: async ({ email, password }) => {
        try {
          const { token, user } = await loginAPI({ email, password })
          set({
            isAuthenticated: true,
            user,
            token,
            isLoginModalOpen: false,
          })
          await loadUserData(token)
          return { success: true }
        } catch (err) {
          return { success: false, error: err.message }
        }
      },

      register: async ({ name, email, password }) => {
        try {
          const { token, user } = await registerAPI({ name, email, password })
          set({
            isAuthenticated: true,
            user,
            token,
            isLoginModalOpen: false,
          })
          await loadUserData(token)
          return { success: true }
        } catch (err) {
          return { success: false, error: err.message }
        }
      },

      logout: () => set({
        isAuthenticated: false,
        user: null,
        token: null,
      }),

      validateToken: async () => {
        const { token } = get()
        if (!token) return
        try {
          const { user } = await getMeAPI(token)
          set({ isAuthenticated: true, user })
          await loadUserData(token)
        } catch {
          set({ isAuthenticated: false, user: null, token: null })
        }
      },

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),
    }),
    {
      name: 'ad-astra-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
      }),
    }
  )
)

export default useAuthStore
