import { useMemo } from 'react'
import useTaskStore, { selectCurrentTasks, countTasks, countCompleted } from '../store/useTaskStore'

function StarMapPanel() {
  const tasks = useTaskStore(selectCurrentTasks)

  const progress = useMemo(() => {
    if (!tasks) return { completed: 0, total: 0, pct: 0 }
    const total = countTasks(tasks)
    const completed = countCompleted(tasks)
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completed, total, pct }
  }, [tasks])

  return (
    <div
      className="absolute top-0 left-1/2 -translate-x-1/2 z-10
                 bg-black/50 backdrop-blur-md border border-white/10
                 rounded-b-2xl px-4 sm:px-8 py-3 sm:py-4 shadow-lg shadow-black/30
                 text-white w-[calc(100vw-4rem)] sm:w-auto sm:min-w-[340px] max-w-[calc(100vw-1rem)]"
    >
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-bold tracking-wider text-cyan-200">
          {tasks?.label ?? 'Ad Astra'}
        </h1>
        <span className="text-sm text-white/60 tabular-nums">
          {progress.completed}/{progress.total}
        </span>
      </div>

      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400
                     rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress.pct}%` }}
        />
      </div>

      <p className="text-center text-xs text-white/40 mt-1.5 tabular-nums">
        {progress.pct}%
      </p>
    </div>
  )
}

export default StarMapPanel
