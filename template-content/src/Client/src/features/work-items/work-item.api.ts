import { apiData, contractClient } from '../../shared/api/http'
import type { WorkItem } from './work-item.schema'

export const workItemApi = {
  list: async (skip = 0, take = 20) =>
    apiData(await contractClient.GET('/api/work-items', { params: { query: { skip, take } } })),
  create: async (title: string) =>
    apiData(await contractClient.POST('/api/work-items', { body: { title } })),
  update: async (item: WorkItem) =>
    apiData(await contractClient.PUT('/api/work-items/{id}', {
      params: { path: { id: item.id } },
      body: { title: item.title, isComplete: !item.isComplete, version: item.version }
    })),
  delete: async (item: WorkItem) =>
    apiData(await contractClient.DELETE('/api/work-items/{id}', {
      params: { path: { id: item.id }, query: { version: item.version } }
    }))
}
