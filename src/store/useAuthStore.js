import { create } from 'zustand'
import { persist } from 'zustand/middleware'
<<<<<<< HEAD
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
      // Strip functions, keep only data
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
=======
>>>>>>> 1ebef703f3f6d2e4fb1ff6b1ee180946bb088367

const useAuthStore = create(
  persist(
    (set, get) => ({
<<<<<<< HEAD
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
=======
      // 用户登录状态
      isAuthenticated: false,
      user: null,
      
      // 登录弹窗状态
      isLoginModalOpen: false,

      /* ---- Actions ---- */

      // 打开登录弹窗
      openLoginModal: () => set({ isLoginModalOpen: true }),
      
      // 关闭登录弹窗
      closeLoginModal: () => set({ isLoginModalOpen: false }),

      // 模拟登录（实际项目中替换为真实 API 调用）
      login: async (credentials) => {
        // 模拟 API 请求延迟
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 简单的模拟验证（实际项目中应调用后端 API）
        if (credentials.email && credentials.password) {
          const mockUser = {
            id: crypto.randomUUID(),
            name: credentials.name || credentials.email.split('@')[0],
            email: credentials.email,
            avatar: null,
            createdAt: Date.now(),
          }
          set({ 
            isAuthenticated: true, 
            user: mockUser,
            isLoginModalOpen: false 
          })
          return { success: true }
        }
        
        return { success: false, error: '邮箱或密码错误' }
      },

      // 登出
      logout: () => set({ 
        isAuthenticated: false, 
        user: null 
      }),

      // 更新用户信息
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
>>>>>>> 1ebef703f3f6d2e4fb1ff6b1ee180946bb088367
      })),
    }),
    {
      name: 'ad-astra-auth',
<<<<<<< HEAD
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
=======
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated,
        user: state.user 
>>>>>>> 1ebef703f3f6d2e4fb1ff6b1ee180946bb088367
      }),
    }
  )
)

export default useAuthStore
