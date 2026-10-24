import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { accountApi } from './account.api'

const profile = { userName: 'demo', email: null, emailConfirmed: false }
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

describe('typed self-service account API', () => {
  const server = vi.fn<typeof fetch>()

  beforeEach(() => {
    server.mockReset()
    vi.stubGlobal('fetch', server)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('returns an accurately typed nullable email without CSRF on profile reads', async () => {
    server.mockResolvedValueOnce(json(profile))
    expect(await accountApi.profile()).toEqual(profile)
    expect(server).toHaveBeenCalledTimes(1)
    const [input, init] = server.mock.calls[0]
    expect(new URL(new Request(input, init).url).pathname).toBe('/api/account/profile')
  })

  it('uses the generated update DTO and shared CSRF transport', async () => {
    server.mockResolvedValueOnce(json({ token: 'account-csrf' }))
      .mockResolvedValueOnce(json({ userName: 'renamed', email: 'new@example.com', emailConfirmed: false }))

    const updated = await accountApi.updateProfile('renamed', 'new@example.com')

    expect(updated.email).toBe('new@example.com')
    const [input, init] = server.mock.calls[1]
    const request = new Request(input, init)
    expect(request.method).toBe('PUT')
    expect(request.headers.get('X-CSRF-TOKEN')).toBe('account-csrf')
    expect(JSON.parse(await request.text())).toEqual({
      userName: 'renamed', email: 'new@example.com'
    })
    expect(init?.credentials).toBe('include')
  })

  it('sends password changes only in the POST body and accepts empty 204', async () => {
    server.mockResolvedValueOnce(json({ token: 'account-csrf' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(accountApi.changePassword('old-secret', 'new-secret')).resolves.toBeUndefined()
    const [input, init] = server.mock.calls[1]
    const request = new Request(input, init)
    expect(new URL(request.url).pathname).toBe('/api/account/password')
    expect(request.url).not.toContain('old-secret')
    expect(JSON.parse(await request.text())).toEqual({
      currentPassword: 'old-secret', newPassword: 'new-secret'
    })
  })

  it('accepts 202 for enumeration-resistant password recovery', async () => {
    server.mockResolvedValueOnce(json({ token: 'account-csrf' }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
    await expect(accountApi.forgotPassword('missing@example.com')).resolves.toBeUndefined()
    const [input, init] = server.mock.calls[1]
    const request = new Request(input, init)
    expect(new URL(request.url).pathname).toBe('/api/account/forgot-password')
    expect(JSON.parse(await request.text())).toEqual({ email: 'missing@example.com' })
  })

  it('keeps reset tokens in JSON rather than URL parameters', async () => {
    server.mockResolvedValueOnce(json({ token: 'account-csrf' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    await accountApi.resetPassword('demo@example.com', 'opaque-reset-token', 'new-secret')

    const [input, init] = server.mock.calls[1]
    const request = new Request(input, init)
    expect(request.url).not.toContain('opaque-reset-token')
    expect(JSON.parse(await request.text())).toEqual({
      email: 'demo@example.com', token: 'opaque-reset-token', newPassword: 'new-secret'
    })
  })

  it('preserves server problem details for missing SMTP configuration', async () => {
    server.mockResolvedValueOnce(json({ token: 'account-csrf' }))
      .mockResolvedValueOnce(json({ title: 'Email changes require an account email provider.' }, 503))
    await expect(accountApi.updateProfile('demo', 'changed@example.com')).rejects.toMatchObject({
      status: 503, message: 'Email changes require an account email provider.'
    })
  })
})
