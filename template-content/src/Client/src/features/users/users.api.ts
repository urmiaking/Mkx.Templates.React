import { apiData, contractClient } from '../../shared/api/http'
import type { components } from '../../shared/api/schema.generated'

export const policies = {
  usersView: 'Mkx.Templates-Users-View',
  usersManage: 'Mkx.Templates-Users-Manage',
  usersManageClaims: 'Mkx.Templates-Users-ManageClaims',
  workItemsView: 'Mkx.Templates-SampleItems-View',
  workItemsManage: 'Mkx.Templates-SampleItems-Manage'
} as const

export type Permission = typeof policies[keyof typeof policies]
export const permissionLabels: Record<Permission, string> = {
  [policies.usersView]: 'مشاهده کاربران',
  [policies.usersManage]: 'ایجاد و مدیریت کاربران',
  [policies.usersManageClaims]: 'مدیریت مجوزهای کاربران و نقش‌ها',
  [policies.workItemsView]: 'مشاهده کارهای نمونه',
  [policies.workItemsManage]: 'مدیریت کارهای نمونه'
}
export type User = components['schemas']['UserSummary']
export type UsersPage = components['schemas']['UsersPage']
export type Role = components['schemas']['RoleSummary']

export const usersApi = {
  list: async (skip = 0, search = '') =>
    apiData(await contractClient.GET('/api/admin/users', { params: { query: { skip, take: 20, search } } })),
  roles: async () =>
    apiData(await contractClient.GET('/api/admin/roles')),
  create: async (userName: string, email: string, password: string) =>
    apiData(await contractClient.POST('/api/admin/users', { body: { userName, email, password } })),
  updateAccount: async (id: string, userName: string, email: string) =>
    apiData(await contractClient.PUT('/api/admin/users/{id}/account', {
      params: { path: { id } }, body: { userName, email }
    })),
  setLocked: async (id: string, locked: boolean) =>
    apiData(await contractClient.PUT('/api/admin/users/{id}/lock', {
      params: { path: { id } }, body: { locked }
    })),
  setRoles: async (id: string, roles: string[]) =>
    apiData(await contractClient.PUT('/api/admin/users/{id}/roles', {
      params: { path: { id } }, body: { roles }
    })),
  remove: async (id: string) =>
    apiData(await contractClient.DELETE('/api/admin/users/{id}', { params: { path: { id } } })),
  permissions: async (id: string, permissions: string[]) =>
    apiData(await contractClient.PUT('/api/admin/users/{id}/permissions', {
      params: { path: { id } }, body: { permissions }
    })),
  rolePermissions: async (role: string, permissions: string[]) =>
    apiData(await contractClient.PUT('/api/admin/roles/{roleName}/permissions', {
      params: { path: { roleName: role } }, body: { permissions }
    }))
}
