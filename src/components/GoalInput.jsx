import { useState, useCallback, useEffect } from 'react'
import { generateTaskTree, hydrateTree } from '../services/llmService'
import useTaskStore from '../store/useTaskStore'
import useAuthStore from '../store/useAuthStore'

// 思考动画文案
const THINKING_MESSAGES = [
  '正在分析目标结构...',
  '拆解核心模块...',
  '规划任务层级...',
  '优化任务顺序...',
  '即将完成...',
]

function ThinkingDots() {
  const [dots, setDots] = useState(0)
  const [message, setMessage] = useState(THINKING_MESSAGES[0])

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots((d) => (d + 1) % 4)
    }, 400)

    const messageInterval = setInterval(() => {
      setMessage((prev) => {
        const idx = THINKING_MESSAGES.indexOf(prev)
        return THINKING_MESSAGES[(idx + 1) % THINKING_MESSAGES.length]
      })
    }, 2000)

    return () => {
      clearInterval(dotsInterval)
      clearInterval(messageInterval)
    }
  }, [])

  return (
    <span className="flex items-center gap-2">
      <svg
        className="w-4 h-4 animate-spin text-cyan-400"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="text-cyan-300">
        {message}
        {'.'.repeat(dots)}
      </span>
    </span>
  )
}

function GoalInput() {
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const setTasks = useTaskStore((s) => s.setTasks)
  const { isAuthenticated, openLoginModal } = useAuthStore()

  const handleGenerate = useCallback(async () => {
    const trimmed = goal.trim()
    if (!trimmed) return

    // 需要登录才能使用 AI 功能
    if (!isAuthenticated) {
      openLoginModal()
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const aiTree = await generateTaskTree(trimmed)
      const tasks = hydrateTree(aiTree)
      setTasks(tasks)
      setGoal('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [goal, setTasks, isAuthenticated, openLoginModal])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !loading) handleGenerate()
    },
    [handleGenerate, loading],
  )

  return (
    <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 px-2 w-full max-w-md">
      {/* 成功提示 */}
      {success && (
        <div className="bg-emerald-900/60 border border-emerald-500/30 text-emerald-200 text-sm px-4 py-2 rounded-lg text-center backdrop-blur flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          任务规划完成，星图已生成！
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-900/60 border border-red-500/30 text-red-200 text-sm px-4 py-2 rounded-lg text-center backdrop-blur">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* 思考中提示 */}
      {loading && (
        <div className="bg-cyan-900/30 border border-cyan-500/20 text-cyan-200 text-sm px-4 py-2 rounded-lg text-center backdrop-blur">
          <ThinkingDots />
        </div>
      )}

      <div
        className="flex items-center gap-2 bg-black/50 backdrop-blur-md
                    border border-white/10 rounded-2xl px-3 sm:px-4 py-3 shadow-lg w-full"
      >
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? 'AI 正在规划中...' : '输入目标...'}
          disabled={loading}
          className="bg-transparent text-white placeholder-white/30 outline-none
                     flex-1 min-w-0 text-sm px-2"
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !goal.trim()}
          className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300
                     border border-cyan-500/30 rounded-xl px-4 py-1.5 text-sm
                     font-medium transition-all duration-200
                     disabled:opacity-30 disabled:cursor-not-allowed
                     whitespace-nowrap flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              规划中
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
              </svg>
              生成
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default GoalInput
