import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usersApi } from './users.api'

const member = {
  id: '66d73248-c01b-42f0-9129-7de21c477d7b',
  userName: 'member',
  email: 'member@example.com',
  roles: ['Users'],
  directPermissions: [],
  emailConfirmed: false,
  isLocked: false
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

describe('typed administration API', () => {
  const server = vi.fn<typeof fetch>()

  beforeEach(() => {
    server.mockReset()
    vi.stubGlobal('fetch', server)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('encodes search and pagination parameters without a CSRF request for reads', async () => {
    server.mockResolvedValueOnce(json({ items: [member], total: 1 }))
    const page = await usersApi.list(20, 'محمود & test')

    expect(page.items[0]?.userName).toBe('member')
    expect(server).toHaveBeenCalledTimes(1)
    const [input, init] = server.mock.calls[0]
    const url = new URL(new Request(input, init).url)
    expect(url.pathname).toBe('/api/admin/users')
    expect(url.searchParams.get('skip')).toBe('20')
    expect(url.searchParams.get('take')).toBe('20')
    expect(url.searchParams.get('search')).toBe('محمود & test')
  })

  it('uses the generated create DTO with same-origin cookies and an antiforgery header', async () => {
    server.mockResolvedValueOnce(json({ token: 'admin-csrf' }))
      .mockResolvedValueOnce(json(member, 201))
    const created = await usersApi.create('member', 'member@example.com', 'valid-example-password')

    expect(created.id).toBe(member.id)
    expect(server).toHaveBeenCalledTimes(2)
    const [input, init] = server.mock.calls[1]
    const request = new Request(input, init)
    expect(new URL(request.url).pathname).toBe('/api/admin/users')
    expect(request.method).toBe('POST')
    expect(request.headers.get('X-CSRF-TOKEN')).toBe('admin-csrf')
    expect(JSON.parse(await request.text())).toEqual({
      userName: 'member', email: 'member@example.com', password: 'valid-example-password'
    })
    expect(init?.credentials).toBe('include')
  })

  it('passes the correct account path and named update payload', async () => {
    server.mockResolvedValueOnce(json({ token: 'admin-csrf' }))
      .mockResolvedValueOnce(json({ ...member, userName: 'renamed' }))
    const updated = await usersApi.updateAccount(member.id, 'renamed', 'member@example.com')

    expect(updated.userName).toBe('renamed')
    const [input, init] = server.mock.calls[1]
    const request = new Request(input, init)
    expect(new URL(request.url).pathname).toBe(`/api/admin/users/${member.id}/account`)
    expect(request.method).toBe('PUT')
    expect(JSON.parse(await request.text())).toEqual({ userName: 'renamed', email: 'member@example.com' })
  })

  it('updates Users role policies at the generated route and handles empty 204 responses', async () => {
    server.mockResolvedValueOnce(json({ token: 'admin-csrf' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    await expect(usersApi.rolePermissions('Users', ['Mkx.Templates-Users-View'])).resolves.toBeUndefined()

    const [input, init] = server.mock.calls[1]
    const request = new Request(input, init)
    expect(new URL(request.url).pathname).toBe('/api/admin/roles/Users/permissions')
    expect(JSON.parse(await request.text())).toEqual({ permissions: ['Mkx.Templates-Users-View'] })
  })

  it('preserves forbidden status for guarded account deletion', async () => {
    server.mockResolvedValueOnce(json({ token: 'admin-csrf' }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
    await expect(usersApi.remove(member.id)).rejects.toMatchObject({ status: 403 })
  })
})
