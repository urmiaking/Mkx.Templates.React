import { request } from '../../shared/api/http'
import type { WorkItem, WorkItemPage } from './work-item.schema'

export const workItemApi = {
  list: (skip = 0, take = 20) => request<WorkItemPage>('/api/work-items/?skip=' + skip + '&take=' + take),
  create: (title: string) => request<WorkItem>('/api/work-items/', { method: 'POST', body: JSON.stringify({ title }) }),
  update: (item: WorkItem) => request<WorkItem>('/api/work-items/' + item.id, { method: 'PUT', body: JSON.stringify({ title: item.title, isComplete: !item.isComplete, version: item.version }) }),
  delete: (item: WorkItem) => request<void>('/api/work-items/' + item.id + '?version=' + item.version, { method: 'DELETE' })
}
