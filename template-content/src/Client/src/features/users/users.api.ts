import { request } from '../../shared/api/http'

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
export type User = {
  id: string
  email: string
  roles: string[]
  directPermissions: string[]
  emailConfirmed: boolean
  isLocked: boolean
}
export type UsersPage = { items: User[]; total: number }
export type Role = { name: string; permissions: string[] }

const userUrl = (id: string) => '/api/admin/users/' + encodeURIComponent(id)
export const usersApi = {
  list: (skip = 0, search = '') => request<UsersPage>('/api/admin/users?skip=' + skip + '&take=20&search=' + encodeURIComponent(search)),
  roles: () => request<Role[]>('/api/admin/roles'),
  create: (email: string, password: string) =>
    request<User>('/api/admin/users', { method: 'POST', body: JSON.stringify({email,password}) }),
  updateAccount: (id: string, email: string) =>
    request<User>(userUrl(id) + '/account', {method:'PUT', body:JSON.stringify({email})}),
  setLocked: (id: string, locked: boolean) =>
    request<User>(userUrl(id) + '/lock', {method:'PUT', body:JSON.stringify({locked})}),
  setRoles: (id: string, roles: string[]) =>
    request<User>(userUrl(id) + '/roles', {method:'PUT',body:JSON.stringify({roles})}),
  remove: (id: string) => request<void>(userUrl(id), {method:'DELETE'}),
  permissions: (id: string, permissions: string[]) =>
    request<void>(userUrl(id) + '/permissions', {
      method: 'PUT', body: JSON.stringify({ permissions })
    }),
  rolePermissions: (role: string, permissions: string[]) =>
    request<void>('/api/admin/roles/' + encodeURIComponent(role) + '/permissions', {
      method: 'PUT', body: JSON.stringify({ permissions })
    })
}
