import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { produce } from 'immer'

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

              // Special case: adding parent above root
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
              // Cannot delete the root node
              if (map.tasks.id === id) return
              deleteInTree(map.tasks, id)
              map.tasks = recalculateStatus(map.tasks)
            }),
          ),

        /* ---- selection ---- */

        selectedTaskId: null,
        selectTask: (id) => set({ selectedTaskId: id }),
        deselectTask: () => set({ selectedTaskId: null }),
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

export default useTaskStore
