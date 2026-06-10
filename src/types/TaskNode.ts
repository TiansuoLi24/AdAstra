export interface TaskNode {
  id: string
  label: string
  status: 'completed' | 'pending'
  children: TaskNode[]
}
