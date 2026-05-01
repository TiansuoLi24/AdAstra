import { useState, useCallback } from 'react'
import { generateTaskTree, hydrateTree } from '../services/llmService'
import useTaskStore from '../store/useTaskStore'

function GoalInput() {
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setTasks = useTaskStore((s) => s.setTasks)

  const handleGenerate = useCallback(async () => {
    const trimmed = goal.trim()
    if (!trimmed) return

    setLoading(true)
    setError('')

    try {
      const aiTree = await generateTaskTree(trimmed)
      const tasks = hydrateTree(aiTree)
      setTasks(tasks)
      setGoal('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [goal, setTasks])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !loading) handleGenerate()
    },
    [handleGenerate, loading],
  )

  return (
    <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 px-2 w-full max-w-md">
      {error && (
        <div className="bg-red-900/60 border border-red-500/30 text-red-200 text-sm px-4 py-2 rounded-lg text-center backdrop-blur">
          {error}
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
          placeholder="输入目标..."
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
                     whitespace-nowrap"
        >
          {loading ? '生成中...' : '生成'}
        </button>
      </div>
    </div>
  )
}

export default GoalInput
