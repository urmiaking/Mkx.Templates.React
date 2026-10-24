import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/http'
import { workItemApi } from './work-item.api'

const example = {
  id: '06eaeb15-0405-4230-8f0a-61bb94ec4292',
  title: 'Write tests',
  isComplete: false,
  version: 1,
  createdAt: '2026-10-24T09:00:00Z'
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('contract-driven WorkItems API', () => {
  const server = vi.fn<typeof fetch>()

  beforeEach(() => {
    server.mockReset()
    vi.stubGlobal('fetch', server)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('uses the OpenAPI route and query names for a read-only listing', async () => {
    server.mockResolvedValueOnce(json({ items: [example], total: 1 }))
    const result = await workItemApi.list(10, 5)

    expect(result.items[0]?.title).toBe('Write tests')
    expect(server).toHaveBeenCalledTimes(1)
    const [input] = server.mock.calls[0]
    const url = new URL(input instanceof Request ? input.url : String(input), 'http://localhost')
    expect(url.pathname).toBe('/api/work-items')
    expect(url.searchParams.get('skip')).toBe('10')
    expect(url.searchParams.get('take')).toBe('5')
  })

  it('sends a CSRF token and cookies on typed writes', async () => {
    server.mockResolvedValueOnce(json({ token: 'csrf-for-test' }))
      .mockResolvedValueOnce(json(example, 201))

    const item = await workItemApi.create('Write tests')

    expect(item.id).toBe(example.id)
    expect(server).toHaveBeenCalledTimes(2)
    const [csrfInput] = server.mock.calls[0]
    expect(csrfInput).toBe('/api/auth/csrf')
    const [input, init] = server.mock.calls[1]
    const req = new Request(input, init)
    expect(req.method).toBe('POST')
    expect(req.headers.get('X-CSRF-TOKEN')).toBe('csrf-for-test')
    expect(JSON.parse(await req.text())).toEqual({ title: 'Write tests' })
    expect(init?.credentials).toBe('include')
  })

  it('preserves the existing ApiError status handling for conflicts', async () => {
    server.mockResolvedValueOnce(json({ token: 'csrf-for-test' }))
      .mockResolvedValueOnce(json({ detail: 'Concurrency conflict' }, 409))

    await expect(workItemApi.update(example)).rejects.toMatchObject({
      status: 409,
      message: 'Concurrency conflict'
    } satisfies Partial<ApiError>)
  })

  it('supports an empty 204 response from a typed delete', async () => {
    server.mockResolvedValueOnce(json({ token: 'csrf-for-test' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(workItemApi.delete(example)).resolves.toBeUndefined()
    const [input, init] = server.mock.calls[1]
    const req = new Request(input, init)
    expect(req.method).toBe('DELETE')
    expect(req.url).toContain(example.id)
    expect(req.url).toContain('version=1')
  })
})
