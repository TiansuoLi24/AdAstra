import { useState, useCallback, useRef } from 'react'
import useTaskStore, { selectCurrentMap, countTasks } from '../store/useTaskStore'

function Sidebar() {
  const [open, setOpen] = useState(false)
  const maps = useTaskStore((s) => s.maps)
  const currentMapId = useTaskStore((s) => s.currentMapId)
  const currentMap = useTaskStore(selectCurrentMap)
  const createMap = useTaskStore((s) => s.createMap)
  const deleteMap = useTaskStore((s) => s.deleteMap)
  const renameMap = useTaskStore((s) => s.renameMap)
  const switchMap = useTaskStore((s) => s.switchMap)

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const inputRef = useRef(null)

  const handleNew = useCallback(() => {
    createMap()
    setOpen(true)
  }, [createMap])

  const handleSwitch = useCallback(
    (id) => {
      if (id !== currentMapId) switchMap(id)
    },
    [currentMapId, switchMap],
  )

  const startRename = useCallback((id, name) => {
    setEditingId(id)
    setEditName(name)
    setTimeout(() => inputRef.current?.select(), 50)
  }, [])

  const commitRename = useCallback(() => {
    if (editingId && editName.trim()) {
      renameMap(editingId, editName.trim())
    }
    setEditingId(null)
  }, [editingId, editName, renameMap])

  const handleRenameKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') commitRename()
      if (e.key === 'Escape') setEditingId(null)
    },
    [commitRename],
  )

  return (
    <>
      {/* collapsed trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-20
                    bg-black/60 backdrop-blur-md border border-white/10
                    rounded-r-xl px-2 py-6 text-white/60 hover:text-white/90
                    transition-all duration-200 hover:bg-black/70
                    ${open ? 'opacity-0 pointer-events-none' : ''}`}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 4l8 6-8 6V4z" />
        </svg>
      </button>

      {/* panel */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-20
                    bg-black/70 backdrop-blur-lg border-r border-white/10
                    transition-all duration-300 ease-out
                    flex flex-col shadow-2xl shadow-black/50
                    ${open ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'}`}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-sm tracking-wider">
            星图列表
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="text-white/40 hover:text-white/80 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 4l-6 6 6 6V4z" />
            </svg>
          </button>
        </div>

        {/* map list */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {maps.map((map) => {
            const isActive = map.id === currentMapId
            const total = countTasks(map.tasks)
            const isEditing = editingId === map.id

            return (
              <div
                key={map.id}
                onClick={() => handleSwitch(map.id)}
                className={`group rounded-xl px-3 py-2.5 cursor-pointer
                           transition-all duration-150
                           ${isActive
                             ? 'bg-cyan-500/15 border border-cyan-500/30'
                             : 'border border-transparent hover:bg-white/5'}`}
              >
                <div className="flex items-center justify-between">
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={handleRenameKeyDown}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white/10 text-white text-sm rounded-lg px-2 py-0.5
                                 outline-none border border-cyan-500/50 w-36"
                    />
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/90 truncate">{map.name}</p>
                      <p className="text-xs text-white/30 mt-0.5">{total} 节点</p>
                    </div>
                  )}

                  {isActive && !isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startRename(map.id, map.name)
                        }}
                        className="text-white/40 hover:text-white/80 p-1 transition-colors"
                        title="重命名"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {maps.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMap(map.id)
                          }}
                          className="text-white/40 hover:text-red-400 p-1 transition-colors"
                          title="删除"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* new map button */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleNew}
            className="w-full flex items-center justify-center gap-2
                       bg-white/5 hover:bg-white/10 border border-white/10
                       rounded-xl px-4 py-2.5 text-sm text-white/70
                       hover:text-white/90 transition-all duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            新建星图
          </button>
        </div>
      </div>
    </>
  )
}

export default Sidebar
