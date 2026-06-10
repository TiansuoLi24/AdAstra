import { useState, useCallback, useEffect, useRef } from 'react'
import useAuthStore from '../store/useAuthStore'

// 星星粒子背景组件
function StarField({ count = 50 }) {
  const canvasRef = useRef(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const width = canvas.width = 400
    const height = canvas.height = 300
    
    const stars = []
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        angle: Math.random() * Math.PI * 2,
      })
    }
    
    let animationId
    const animate = () => {
      ctx.clearRect(0, 0, width, height)
      
      stars.forEach(star => {
        star.angle += star.twinkleSpeed
        const opacity = star.opacity * (0.5 + Math.sin(star.angle) * 0.5)
        
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
        ctx.fill()
        
        // 添加光晕
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.size * 3
        )
        gradient.addColorStop(0, `rgba(77, 208, 225, ${opacity * 0.3})`)
        gradient.addColorStop(1, 'rgba(77, 208, 225, 0)')
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      })
      
      animationId = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => cancelAnimationFrame(animationId)
  }, [count])
  
  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full opacity-60"
      style={{ pointerEvents: 'none' }}
    />
  )
}

// 登录表单组件
function LoginForm({ onSubmit, isLoading, error, isRegister, onToggleMode }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    onSubmit({ email, password, name: isRegister ? name : undefined })
  }, [email, password, name, isRegister, onSubmit])

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isRegister && (
        <div className="space-y-1">
          <label className="text-xs text-white/60">昵称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="给自己起个名字"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3
                       text-white placeholder-white/30 text-sm
                       focus:outline-none focus:border-cyan-500/50 focus:bg-white/10
                       transition-all duration-200"
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs text-white/60">邮箱</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3
                     text-white placeholder-white/30 text-sm
                     focus:outline-none focus:border-cyan-500/50 focus:bg-white/10
                     transition-all duration-200"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-white/60">密码</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-12
                       text-white placeholder-white/30 text-sm
                       focus:outline-none focus:border-cyan-500/50 focus:bg-white/10
                       transition-all duration-200"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 
                       hover:text-white/60 transition-colors"
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-2
                        flex items-center gap-2 text-red-300 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !email || !password}
        className="w-full bg-gradient-to-r from-cyan-500/30 to-purple-500/30
                   hover:from-cyan-500/40 hover:to-purple-500/40
                   border border-cyan-500/40 rounded-lg px-4 py-3
                   text-white font-medium text-sm
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200
                   flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            穿越星海...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {isRegister ? '开启星际之旅' : '进入星图'}
          </>
        )}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={onToggleMode}
          className="text-xs text-white/50 hover:text-cyan-400 transition-colors"
        >
          {isRegister ? '已有账号？登录' : '没有账号？注册'}
        </button>
      </div>
    </form>
  )
}

// 主登录弹窗组件
function LoginModal() {
<<<<<<< HEAD
  const { isLoginModalOpen, closeLoginModal, login, register } = useAuthStore()
=======
  const { isLoginModalOpen, closeLoginModal, login } = useAuthStore()
>>>>>>> 1ebef703f3f6d2e4fb1ff6b1ee180946bb088367
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const modalRef = useRef(null)

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeLoginModal()
    }
    if (isLoginModalOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isLoginModalOpen, closeLoginModal])

  const handleSubmit = useCallback(async (credentials) => {
    setIsLoading(true)
    setError('')
<<<<<<< HEAD

    const action = isRegister ? register : login
    const result = await action(credentials)

=======
    
    const result = await login(credentials)
    
>>>>>>> 1ebef703f3f6d2e4fb1ff6b1ee180946bb088367
    if (!result.success) {
      setError(result.error)
    }
    setIsLoading(false)
<<<<<<< HEAD
  }, [login, register, isRegister])
=======
  }, [login])
>>>>>>> 1ebef703f3f6d2e4fb1ff6b1ee180946bb088367

  if (!isLoginModalOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closeLoginModal}
      />
      
      {/* 星星背景 */}
      <StarField count={60} />

      {/* 弹窗主体 */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-2xl overflow-hidden
                   bg-black/90 backdrop-blur-xl
                   border border-white/10
                   shadow-2xl shadow-cyan-500/10
                   animate-modal-in"
        style={{
          animation: 'modalIn 0.3s ease-out forwards',
        }}
      >
        {/* 顶部渐变装饰 */}
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500" />
        
        {/* 关闭按钮 */}
        <button
          onClick={closeLoginModal}
          className="absolute top-4 right-4 w-8 h-8 rounded-full
                     bg-white/5 hover:bg-white/10
                     flex items-center justify-center
                     text-white/40 hover:text-white/80
                     transition-all duration-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* 内容区域 */}
        <div className="px-8 py-10">
          {/* 标题 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full
                            bg-gradient-to-br from-cyan-500/20 to-purple-500/20
                            border border-cyan-500/30 mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4dd0e1" strokeWidth="1.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-wider mb-2">
              {isRegister ? '注册账号' : '欢迎回来'}
            </h2>
            <p className="text-sm text-white/50">
              {isRegister ? '开启你的星际任务之旅' : '继续你的星际探索'}
            </p>
          </div>

          {/* 表单 */}
          <LoginForm 
            onSubmit={handleSubmit} 
            isLoading={isLoading} 
            error={error}
            isRegister={isRegister}
            onToggleMode={() => setIsRegister(!isRegister)}
          />
        </div>

        {/* 底部装饰 */}
        <div className="px-8 py-4 bg-white/5 text-center">
          <p className="text-xs text-white/30">
            穿越星海，抵达目标
          </p>
        </div>
      </div>

      {/* 注入动画样式 */}
      <style>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default LoginModal
