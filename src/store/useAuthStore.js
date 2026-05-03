import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
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
      })),
    }),
    {
      name: 'ad-astra-auth',
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated,
        user: state.user 
      }),
    }
  )
)

export default useAuthStore
