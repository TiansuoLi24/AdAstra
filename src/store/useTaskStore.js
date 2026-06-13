import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { produce } from 'immer'
import { syncMapsAPI } from '../services/apiService'

/* ---------- tree helpers ---------- */

function recalculateStatus(task) {
  if (task.children.length === 0) return task
  const children = task.children.map(recalculateStatus)
  const allCompleted = children.every((c) => c.status === 'completed')
  return { ...task, children, status: allCompleted ? 'completed' : 'pending' }
}

function toggleLeafById(task, id) {
  if (task.id === id) {
    if (task.children.length === 0) {
      return { ...task, status: task.status === 'completed' ? 'pending' : 'completed' }
    }
    return task
  }
  return { ...task, children: task.children.map((c) => toggleLeafById(c, id)) }
}

export function countTasks(task) {
  let n = 1
  for (const c of task.children) n += countTasks(c)
  return n
}

export function countCompleted(task) {
  let n = task.status === 'completed' ? 1 : 0
  for (const c of task.children) n += countCompleted(c)
  return n
}

export function findTaskById(task, id) {
  if (task.id === id) return task
  for (const c of task.children) {
    const found = findTaskById(c, id)
    if (found) return found
  }
  return null
}

/* ---------- immer-based tree mutators (work on drafts) ---------- */

function newChildNode(label = '新子目标') {
  return { id: crypto.randomUUID(), label, status: 'pending', children: [] }
}

function renameInTree(task, id, label) {
  if (task.id === id) {
    task.label = label
    return true
  }
  for (const c of task.children) {
    if (renameInTree(c, id, label)) return true
  }
  return false
}

function addChildInTree(task, parentId) {
  if (task.id === parentId) {
    task.children.push(newChildNode())
    return true
  }
  for (const c of task.children) {
    if (addChildInTree(c, parentId)) return true
  }
  return false
}

function addParentInTree(task, childId) {
  for (let i = 0; i < task.children.length; i++) {
    if (task.children[i].id === childId) {
      task.children[i] = {
        id: crypto.randomUUID(),
        label: '新主目标',
        status: 'pending',
        children: [task.children[i]],
      }
      return true
    }
  }
  for (const c of task.children) {
    if (addParentInTree(c, childId)) return true
  }
  return false
}

function deleteInTree(task, id) {
  task.children = task.children.filter((c) => c.id !== id)
  for (const c of task.children) {
    deleteInTree(c, id)
  }
}

function moveTaskInTree(task, sourceId, targetId, newIndex) {
  if (task.id === sourceId || task.id === targetId) return false

  for (let i = 0; i < task.children.length; i++) {
    const child = task.children[i]

    if (child.id === targetId) {
      const sourceChild = findTaskById(task, sourceId)
      if (!sourceChild) return false

      task.children = task.children.filter(c => c.id !== sourceId)

      const insertIdx = newIndex >= 0 ? Math.min(newIndex, task.children.length) : task.children.length
      task.children.splice(insertIdx, 0, { ...sourceChild })
      return true
    }

    if (moveTaskInTree(child, sourceId, targetId, newIndex)) {
      return true
    }
  }
  return false
}

function reorderChildInTree(task, sourceId, overId) {
  const findParent = (node, childId) => {
    for (const child of node.children) {
      if (child.id === childId) return node
      const found = findParent(child, childId)
      if (found) return found
    }
    return null
  }

  const parent = findParent(task, sourceId)
  if (!parent) return false

  const sourceIndex = parent.children.findIndex(c => c.id === sourceId)
  const overIndex = parent.children.findIndex(c => c.id === overId)

  if (sourceIndex === -1 || overIndex === -1) return false

  const [removed] = parent.children.splice(sourceIndex, 1)
  const newIndex = sourceIndex < overIndex ? overIndex : overIndex
  parent.children.splice(newIndex, 0, removed)

  return true
}

/* ---------- helpers ---------- */

function createDefaultMap(name = '新星图') {
  return {
    id: crypto.randomUUID(),
    name,
    tasks: recalculateStatus({
      id: 'root',
      label: name,
      status: 'pending',
      children: [
        {
          id: 'a',
          label: 'Alpha',
          status: 'pending',
          children: [
            { id: 'a1', label: 'Alpha-1', status: 'pending', children: [] },
            { id: 'a2', label: 'Alpha-2', status: 'pending', children: [] },
            { id: 'a3', label: 'Alpha-3', status: 'pending', children: [] },
          ],
        },
        {
          id: 'b',
          label: 'Beta',
          status: 'pending',
          children: [
            { id: 'b1', label: 'Beta-1', status: 'pending', children: [] },
            {
              id: 'b2',
              label: 'Beta-2',
              status: 'pending',
              children: [
                { id: 'b2a', label: 'Beta-2a', status: 'pending', children: [] },
                { id: 'b2b', label: 'Beta-2b', status: 'pending', children: [] },
              ],
            },
          ],
        },
        {
          id: 'c',
          label: 'Gamma',
          status: 'pending',
          children: [
            { id: 'c1', label: 'Gamma-1', status: 'pending', children: [] },
            { id: 'c2', label: 'Gamma-2', status: 'pending', children: [] },
          ],
        },
      ],
    }),
    createdAt: Date.now(),
  }
}

function currentMapIdx(state) {
  return state.maps.findIndex((m) => m.id === state.currentMapId)
}

/* ---------- store ---------- */

const useTaskStore = create(
  persist(
    (set, get) => {
      const initial = createDefaultMap()

      return {
        maps: [initial],
        currentMapId: initial.id,

        /* ---- map-level actions ---- */

        createMap: (name) =>
          set((state) => {
            const map = createDefaultMap(name)
            return { maps: [...state.maps, map], currentMapId: map.id }
          }),

        deleteMap: (id) =>
          set((state) => {
            const filtered = state.maps.filter((m) => m.id !== id)
            if (filtered.length === 0) {
              const fallback = createDefaultMap()
              return { maps: [fallback], currentMapId: fallback.id }
            }
            const currentMapId =
              state.currentMapId === id ? filtered[0].id : state.currentMapId
            return { maps: filtered, currentMapId }
          }),

        renameMap: (id, name) =>
          set((state) => ({
            maps: state.maps.map((m) =>
              m.id !== id
                ? m
                : { ...m, name, tasks: { ...m.tasks, label: name } },
            ),
          })),

        switchMap: (id) => set({ currentMapId: id, selectedTaskId: null }),

        /* ---- task-level actions (on current map) ---- */

        toggleTask: (id) =>
          set((state) => {
            const idx = currentMapIdx(state)
            if (idx === -1) return state
            const map = state.maps[idx]
            const toggled = toggleLeafById(map.tasks, id)
            const maps = [...state.maps]
            maps[idx] = { ...map, tasks: recalculateStatus(toggled) }
            return { maps }
          }),

        setTasks: (tasks) =>
          set((state) => {
            const idx = currentMapIdx(state)
            if (idx === -1) return state
            const maps = [...state.maps]
            maps[idx] = { ...maps[idx], tasks: recalculateStatus(tasks) }
            return { maps, selectedTaskId: null }
          }),

        /* ---- node editing actions (immer) ---- */

        renameTask: (id, label) =>
          set(
            produce((state) => {
              const idx = currentMapIdx(state)
              if (idx === -1) return
              renameInTree(state.maps[idx].tasks, id, label)
              state.maps[idx].tasks = recalculateStatus(state.maps[idx].tasks)
            }),
          ),

        addChild: (parentId) =>
          set(
            produce((state) => {
              const idx = currentMapIdx(state)
              if (idx === -1) return
              addChildInTree(state.maps[idx].tasks, parentId)
              state.maps[idx].tasks = recalculateStatus(state.maps[idx].tasks)
            }),
          ),

        addParent: (childId) =>
          set(
            produce((state) => {
              const idx = currentMapIdx(state)
              if (idx === -1) return
              const map = state.maps[idx]

              if (map.tasks.id === childId) {
                map.tasks = {
                  id: crypto.randomUUID(),
                  label: '新主目标',
                  status: 'pending',
                  children: [map.tasks],
                }
                map.tasks = recalculateStatus(map.tasks)
                return
              }

              addParentInTree(map.tasks, childId)
              map.tasks = recalculateStatus(map.tasks)
            }),
          ),

        deleteTask: (id) =>
          set(
            produce((state) => {
              const idx = currentMapIdx(state)
              if (idx === -1) return
              const map = state.maps[idx]
              if (map.tasks.id === id) return
              deleteInTree(map.tasks, id)
              map.tasks = recalculateStatus(map.tasks)
            }),
          ),

        reorderTask: (sourceId, overId) =>
          set(
            produce((state) => {
              const idx = currentMapIdx(state)
              if (idx === -1) return
              const map = state.maps[idx]
              if (reorderChildInTree(map.tasks, sourceId, overId)) {
                map.tasks = recalculateStatus(map.tasks)
              }
            }),
          ),

        /* ---- selection ---- */

        selectedTaskId: null,
        selectTask: (id) => set({ selectedTaskId: id }),
        deselectTask: () => set({ selectedTaskId: null }),

        // Server sync
        loadFromServer: (maps) => {
          if (maps && maps.length > 0) {
            set({
              maps,
              currentMapId: maps[0].id,
              selectedTaskId: null,
            })
          }
        },

        syncToServer: () => {
          const raw = localStorage.getItem('ad-astra-auth')
          if (!raw) return
          try {
            const { state } = JSON.parse(raw)
            if (!state.isAuthenticated || !state.token) return
            const { maps } = get()
            syncMapsAPI(state.token, maps).catch(() => {})
          } catch {}
        },
      }
    },
    {
      name: 'ad-astra-star-maps',
      version: 2,
    },
  ),
)

/* ---------- derived selectors ---------- */

export function selectCurrentMap(state) {
  return state.maps.find((m) => m.id === state.currentMapId) ?? null
}

export function selectCurrentTasks(state) {
  return selectCurrentMap(state)?.tasks ?? null
}

// Auto-sync to server when maps change (debounced)
let syncTimer = null
useTaskStore.subscribe((state, prevState) => {
  if (state.maps !== prevState.maps) {
    clearTimeout(syncTimer)
    syncTimer = setTimeout(() => {
      useTaskStore.getState().syncToServer()
    }, 2000)
  }
})

export default useTaskStore
