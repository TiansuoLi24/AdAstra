import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import useTaskStore, { selectCurrentMap, countTasks, countCompleted } from '../store/useTaskStore'
import useAuthStore from '../store/useAuthStore'
import SettingsPanel from './SettingsPanel'

// 可拖拽的任务节点
function SortableTaskNode({ task, level = 0, selectedTaskId, onSelect, onToggle, expandedNodes, onToggleExpand, onDragEnd }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  const hasChildren = task.children && task.children.length > 0
  const isExpanded = expandedNodes.has(task.id)
  const isSelected = selectedTaskId === task.id
  const isCompleted = task.status === 'completed'
  const isLeaf = !hasChildren

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    onSelect(task.id)
  }, [task.id, onSelect])

  const handleToggleExpand = useCallback((e) => {
    e.stopPropagation()
    onToggleExpand(task.id)
  }, [task.id, onToggleExpand])

  const handleToggle = useCallback((e) => {
    e.stopPropagation()
    if (isLeaf) {
      onToggle(task.id)
    }
  }, [task.id, isLeaf, onToggle])

  const indent = level * 16

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        onClick={handleClick}
        className={`group flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer
                   transition-all duration-150 text-sm
                   ${isSelected ? 'bg-cyan-500/20 border border-cyan-500/40' : 'border border-transparent hover:bg-white/5'}
                   ${isDragging ? 'shadow-lg shadow-cyan-500/20' : ''}`}
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {/* 拖拽手柄 */}
        <button
          {...attributes}
          {...listeners}
          className="w-5 h-5 flex items-center justify-center text-white/20 hover:text-white/50
                     cursor-grab active:cursor-grabbing shrink-0 touch-manipulation"
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="3" cy="3" r="1" />
            <circle cx="9" cy="3" r="1" />
            <circle cx="3" cy="6" r="1" />
            <circle cx="9" cy="6" r="1" />
            <circle cx="3" cy="9" r="1" />
            <circle cx="9" cy="9" r="1" />
          </svg>
        </button>

        {/* 展开/折叠按钮 */}
        {hasChildren ? (
          <button
            onClick={handleToggleExpand}
            className="w-5 h-5 flex items-center justify-center text-white/40
                       hover:text-white/80 transition-colors shrink-0 touch-manipulation"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            >
              <path d="M4 2L8 6L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <span className="w-5 h-5 shrink-0" />
        )}

        <span className={`shrink-0 transition-colors ${isCompleted ? 'text-amber-400' : level === 0 ? 'text-cyan-400' : 'text-white/60'}`}>
          {isCompleted ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          ) : level === 0 ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" opacity="0.6">
              <circle cx="12" cy="12" r="8" />
            </svg>
          )}
        </span>

        <span className={`flex-1 truncate transition-colors ${isCompleted ? 'text-white/50 line-through' : isSelected ? 'text-white' : 'text-white/70'}`}>
          {task.label}
        </span>

        {isLeaf && (
          <button
            onClick={handleToggle}
            className={`shrink-0 px-2 py-1 rounded text-xs font-medium
                       transition-all duration-150
                       ${isCompleted ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'}`}
          >
            {isCompleted ? '撤销' : '点亮'}
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="overflow-hidden">
          <SortableContext items={task.children.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {task.children.map((child) => (
              <SortableTaskNode
                key={child.id}
                task={child}
                level={level + 1}
                selectedTaskId={selectedTaskId}
                onSelect={onSelect}
                onToggle={onToggle}
                expandedNodes={expandedNodes}
                onToggleExpand={onToggleExpand}
                onDragEnd={onDragEnd}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  )
}

// 递归渲染任务树 (无拖拽版本，用于移动端)
function TaskTreeNode({ task, level = 0, selectedTaskId, onSelect, onToggle, expandedNodes, onToggleExpand }) {
  const hasChildren = task.children && task.children.length > 0
  const isExpanded = expandedNodes.has(task.id)
  const isSelected = selectedTaskId === task.id
  const isCompleted = task.status === 'completed'
  const isLeaf = !hasChildren

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    onSelect(task.id)
  }, [task.id, onSelect])

  const handleToggleExpand = useCallback((e) => {
    e.stopPropagation()
    onToggleExpand(task.id)
  }, [task.id, onToggleExpand])

  const handleToggle = useCallback((e) => {
    e.stopPropagation()
    if (isLeaf) {
      onToggle(task.id)
    }
  }, [task.id, isLeaf, onToggle])

  const indent = level * 16

  return (
    <div className="select-none">
      <div
        onClick={handleClick}
        className={`group flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer
                   transition-all duration-150 text-sm
                   ${isSelected ? 'bg-cyan-500/20 border border-cyan-500/40' : 'border border-transparent hover:bg-white/5'}`}
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {hasChildren ? (
          <button onClick={handleToggleExpand} className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white/80 shrink-0">
            <svg width="12" height="12" viewBox="0 0 12 12" className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              <path d="M4 2L8 6L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        ) : (
          <span className="w-5 h-5 shrink-0" />
        )}

        <span className={`shrink-0 transition-colors ${isCompleted ? 'text-amber-400' : level === 0 ? 'text-cyan-400' : 'text-white/60'}`}>
          {isCompleted ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          ) : level === 0 ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" opacity="0.6">
              <circle cx="12" cy="12" r="8" />
            </svg>
          )}
        </span>

        <span className={`flex-1 truncate ${isCompleted ? 'text-white/50 line-through' : isSelected ? 'text-white' : 'text-white/70'}`}>
          {task.label}
        </span>

        {isLeaf && (
          <button onClick={handleToggle} className={`shrink-0 px-2 py-1 rounded text-xs ${isCompleted ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
            {isCompleted ? '撤销' : '点亮'}
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="overflow-hidden">
          {task.children.map((child) => (
            <TaskTreeNode key={child.id} task={child} level={level + 1} selectedTaskId={selectedTaskId} onSelect={onSelect} onToggle={onToggle} expandedNodes={expandedNodes} onToggleExpand={onToggleExpand} />
          ))}
        </div>
      )}
    </div>
  )
}

function Sidebar() {
  const [isHovered, setIsHovered] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [mapsOpen, setMapsOpen] = useState(true)
  const [tasksOpen, setTasksOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [expandedNodes, setExpandedNodes] = useState(new Set())
  const hoverTimeoutRef = useRef(null)
  const sidebarRef = useRef(null)

  // 移动端检测
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768
    }
    return false
  })

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 关闭移动端抽屉
  const closeMobile = useCallback(() => {
    setIsMobileOpen(false)
  }, [])

  // 点击遮罩关闭
  const handleOverlayClick = useCallback(() => {
    closeMobile()
  }, [closeMobile])

  const maps = useTaskStore((s) => s.maps)
  const currentMapId = useTaskStore((s) => s.currentMapId)
  const currentMap = useTaskStore(selectCurrentMap)
  const createMap = useTaskStore((s) => s.createMap)
  const deleteMap = useTaskStore((s) => s.deleteMap)
  const renameMap = useTaskStore((s) => s.renameMap)
  const switchMap = useTaskStore((s) => s.switchMap)
  const selectedTaskId = useTaskStore((s) => s.selectedTaskId)
  const selectTask = useTaskStore((s) => s.selectTask)
  const reorderTask = useTaskStore((s) => s.reorderTask)
  const toggleTask = useTaskStore((s) => s.toggleTask)

  // 认证相关
  const { isAuthenticated, user, openLoginModal, logout } = useAuthStore()

  // 包装点亮/撤销操作，需要登录
  const handleToggleWithAuth = useCallback((taskId) => {
    if (!isAuthenticated) {
      openLoginModal()
      return
    }
    toggleTask(taskId)
  }, [isAuthenticated, openLoginModal, toggleTask])

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // 处理拖拽结束
  const handleDragEnd = useCallback(
    (event) => {
      if (!isAuthenticated) {
        openLoginModal()
        return
      }
      const { active, over } = event
      if (over && active.id !== over.id) {
        reorderTask(active.id, over.id)
      }
    },
    [isAuthenticated, openLoginModal, reorderTask]
  )

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const inputRef = useRef(null)

  const progress = useMemo(() => {
    if (!currentMap?.tasks) return { completed: 0, total: 0, pct: 0 }
    const total = countTasks(currentMap.tasks)
    const completed = countCompleted(currentMap.tasks)
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completed, total, pct }
  }, [currentMap])

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 200)
  }, [])

  const handleNew = useCallback(() => {
    createMap()
    if (isMobile) {
      setIsMobileOpen(true)
    } else {
      setIsHovered(true)
    }
  }, [createMap, isMobile])

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

  const toggleExpandNode = useCallback((id) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    const allIds = new Set()
    const traverse = (task) => {
      if (task.children?.length > 0) {
        allIds.add(task.id)
        task.children.forEach(traverse)
      }
    }
    if (currentMap?.tasks) {
      traverse(currentMap.tasks)
    }
    setExpandedNodes(allIds)
  }, [currentMap])

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set())
  }, [])

  // 移动端触发器按钮
  const MobileTrigger = () => (
    <button
      onClick={() => setIsMobileOpen(true)}
      className="fixed bottom-4 left-4 z-30 w-12 h-12 rounded-full
                 bg-black/70 backdrop-blur-md border border-white/20
                 shadow-lg shadow-black/50 flex items-center justify-center
                 active:scale-95 transition-transform touch-manipulation
                 md:hidden"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-white/80">
        <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    </button>
  )

  // 移动端遮罩层
  const MobileOverlay = () => (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black/60 z-20 md:hidden"
    />
  )

  // 移动端底部抽屉
  const MobileDrawer = () => (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 bg-black/95 backdrop-blur-xl
                 border-t border-white/20 rounded-t-2xl
                 transition-transform duration-300 ease-out
                 max-h-[85vh] flex flex-col
                 md:hidden
                 ${isMobileOpen ? 'translate-y-0' : 'translate-y-full'}`}
    >
      {/* 拖动指示条 */}
      <div className="flex justify-center py-2">
        <div className="w-10 h-1 bg-white/30 rounded-full" />
      </div>

      {/* 内容区域 */}
      <div ref={sidebarRef} className="flex-1 overflow-y-auto px-4 pb-safe">
        {/* 标题区 */}
        <div className="pb-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4dd0e1" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <h2 className="text-white font-bold text-lg tracking-wider">任务星图</h2>
            </div>
            <button
              onClick={closeMobile}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 用户信息/登录入口 */}
          <div className="flex items-center justify-between mt-3 px-1">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center">
                  <span className="text-sm text-white font-medium">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-white">{user?.name}</p>
                  <p className="text-xs text-white/40">{user?.email}</p>
                </div>
              </div>
            ) : (
              <button
                onClick={openLoginModal}
                className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
                登录 / 注册
              </button>
            )}
            {isAuthenticated && (
              <button
                onClick={logout}
                className="text-xs text-white/40 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-white/5"
              >
                退出
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>{currentMap?.tasks?.label || '新星图'}</span>
            <span>{progress.completed}/{progress.total}</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>

        {/* 任务树 */}
        <div className="py-3">
          <div
            onClick={() => setTasksOpen(!tasksOpen)}
            className="flex items-center justify-between py-2 cursor-pointer"
          >
            <div className="flex items-center gap-2 text-white/60">
              <svg width="12" height="12" viewBox="0 0 12 12" className={`transition-transform ${tasksOpen ? 'rotate-90' : ''}`}>
                <path d="M4 2L8 6L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span className="text-sm font-medium">任务树</span>
            </div>
            <div className="flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); expandAll(); }} className="text-xs px-2 py-1 rounded bg-white/10">展开</button>
              <button onClick={(e) => { e.stopPropagation(); collapseAll(); }} className="text-xs px-2 py-1 rounded bg-white/10">折叠</button>
            </div>
          </div>

          {tasksOpen && currentMap?.tasks && (
            <TaskTreeNode
              task={currentMap.tasks}
              level={0}
              selectedTaskId={selectedTaskId}
              onSelect={selectTask}
              onToggle={handleToggleWithAuth}
              expandedNodes={expandedNodes}
              onToggleExpand={toggleExpandNode}
            />
          )}
        </div>

        {/* 设置 */}
        <div className="py-3 border-t border-white/10">
          <div
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex items-center justify-between py-2 cursor-pointer"
          >
            <div className="flex items-center gap-2 text-white/60">
              <svg width="12" height="12" viewBox="0 0 12 12" className={`transition-transform ${settingsOpen ? 'rotate-90' : ''}`}>
                <path d="M4 2L8 6L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span className="text-sm font-medium">设置</span>
            </div>
          </div>
          {settingsOpen && <SettingsPanel />}
        </div>

        {/* 星图列表 */}
        <div className="py-3 border-t border-white/10">
          <div
            onClick={() => setMapsOpen(!mapsOpen)}
            className="flex items-center justify-between py-2 cursor-pointer"
          >
            <div className="flex items-center gap-2 text-white/60">
              <svg width="12" height="12" viewBox="0 0 12 12" className={`transition-transform ${mapsOpen ? 'rotate-90' : ''}`}>
                <path d="M4 2L8 6L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span className="text-sm font-medium">星图列表</span>
            </div>
            <span className="text-xs text-white/30">{maps.length}</span>
          </div>

          {mapsOpen && (
            <div className="space-y-2 mt-2">
              {maps.map((map) => {
                const isActive = map.id === currentMapId
                return (
                  <div
                    key={map.id}
                    onClick={() => { handleSwitch(map.id); closeMobile(); }}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      isActive ? 'bg-cyan-500/20 border border-cyan-500/40' : 'bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className="text-sm text-white/80">{map.name}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 新建按钮 */}
        <button
          onClick={handleNew}
          className="w-full flex items-center justify-center gap-2 mt-4 mb-6
                     bg-gradient-to-r from-cyan-500/20 to-purple-500/20
                     border border-cyan-500/30 rounded-xl px-4 py-3 text-cyan-300
                     active:scale-95 transition-transform touch-manipulation"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建星图
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* 移动端触发器 */}
      <MobileTrigger />

      {/* 移动端遮罩 */}
      {isMobileOpen && <MobileOverlay />}

      {/* 移动端底部抽屉 */}
      <MobileDrawer />

      {/* 桌面端悬停触发区域 */}
      {!isMobile && (
        <div
          className={`fixed left-0 top-0 bottom-0 w-12 z-30 transition-opacity duration-300
                     ${isHovered ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'}`}
          onMouseEnter={handleMouseEnter}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4
                          w-16 h-32 bg-gradient-to-r from-transparent to-black/30
                          rounded-r-full animate-pulse" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2
                          bg-black/70 backdrop-blur-md border border-white/10 border-l-0
                          rounded-r-xl px-2 py-6 shadow-lg">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-white/60">
              <path d="M7 4l8 6-8 6V4z" />
            </svg>
          </div>
        </div>
      )}

      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <div
          ref={sidebarRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`fixed left-0 top-0 bottom-0 z-20 overflow-hidden
                      bg-black/80 backdrop-blur-xl border-r border-white/10
                      transition-all duration-300 ease-out
                      flex flex-col shadow-2xl shadow-black/50
                      ${isHovered ? 'w-72 translate-x-0' : 'w-0 -translate-x-full'}`}
        >
          <div className="h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500" />

          <div className="px-4 py-4 border-b border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4dd0e1" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <h2 className="text-white font-bold text-lg tracking-wider">任务星图</h2>
            </div>

            <div className="mt-2">
              {/* 用户信息/登录入口 */}
              <div className="flex items-center justify-between px-1 mb-3">
                {isAuthenticated ? (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center">
                      <span className="text-xs text-white font-medium">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{user?.name}</p>
                      <p className="text-[10px] text-white/40 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={logout}
                      className="text-[10px] text-white/40 hover:text-red-400 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5"
                    >
                      退出
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={openLoginModal}
                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
                    </svg>
                    登录 / 注册
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                <span>{currentMap?.tasks?.label || '新星图'}</span>
                <span>{progress.completed}/{progress.total}</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-3">
            <div
              onClick={() => setTasksOpen(!tasksOpen)}
              className="flex items-center justify-between px-3 py-2 cursor-pointer
                         text-white/60 hover:text-white/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" className={`transition-transform ${tasksOpen ? 'rotate-90' : ''}`}>
                  <path d="M4 2L8 6L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <span className="text-xs font-medium uppercase tracking-wider">任务树</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); expandAll(); }} className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white/10">展开</button>
                <button onClick={(e) => { e.stopPropagation(); collapseAll(); }} className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white/10">折叠</button>
              </div>
            </div>

            {tasksOpen && currentMap?.tasks && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={currentMap.tasks.children.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="mt-1">
                    <SortableTaskNode
                      task={currentMap.tasks}
                      level={0}
                      selectedTaskId={selectedTaskId}
                      onSelect={selectTask}
                      onToggle={handleToggleWithAuth}
                      expandedNodes={expandedNodes}
                      onToggleExpand={toggleExpandNode}
                      onDragEnd={handleDragEnd}
                    />
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          <div className="border-t border-white/10">
            <div
              onClick={() => { setSettingsOpen(!settingsOpen); setTasksOpen(false); setMapsOpen(false); }}
              className="flex items-center justify-between px-4 py-3 cursor-pointer
                         text-white/60 hover:text-white/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" className={`transition-transform ${settingsOpen ? 'rotate-90' : ''}`}>
                  <path d="M4 2L8 6L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <span className="text-xs font-medium uppercase tracking-wider">设置</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>

            {settingsOpen && (
              <div className="max-h-[50vh] overflow-y-auto">
                <SettingsPanel />
              </div>
            )}
          </div>

          <div className="border-t border-white/10">
            <div
              onClick={() => setMapsOpen(!mapsOpen)}
              className="flex items-center justify-between px-4 py-3 cursor-pointer
                         text-white/60 hover:text-white/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" className={`transition-transform ${mapsOpen ? 'rotate-90' : ''}`}>
                  <path d="M4 2L8 6L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <span className="text-xs font-medium uppercase tracking-wider">星图列表</span>
              </div>
              <span className="text-[10px] text-white/30">{maps.length}</span>
            </div>

            {mapsOpen && (
              <div className="px-2 pb-2 space-y-1 max-h-48 overflow-y-auto">
                {maps.map((map) => {
                  const isActive = map.id === currentMapId
                  const isEditing = editingId === map.id

                  return (
                    <div
                      key={map.id}
                      onClick={() => handleSwitch(map.id)}
                      className={`group rounded-lg px-3 py-2 cursor-pointer
                                 transition-all duration-150
                                 ${isActive ? 'bg-cyan-500/15 border border-cyan-500/30' : 'border border-transparent hover:bg-white/5'}`}
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
                            className="bg-white/10 text-white text-xs rounded px-2 py-0.5 outline-none border border-cyan-500/50 w-28"
                          />
                        ) : (
                          <span className="text-xs text-white/80 truncate">{map.name}</span>
                        )}

                        {isActive && !isEditing && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); startRename(map.id, map.name); }}
                              className="text-white/40 hover:text-white/80 p-1 transition-colors"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            {maps.length > 1 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteMap(map.id); }}
                                className="text-white/40 hover:text-red-400 p-1 transition-colors"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            )}
          </div>

          <div className="p-3 border-t border-white/10">
            <button
              onClick={handleNew}
              className="w-full flex items-center justify-center gap-2
                         bg-gradient-to-r from-cyan-500/20 to-purple-500/20
                         hover:from-cyan-500/30 hover:to-purple-500/30
                         border border-cyan-500/30 hover:border-cyan-500/50
                         rounded-xl px-4 py-2.5 text-sm text-cyan-300
                         transition-all duration-200"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              新建星图
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
