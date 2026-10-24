import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../shared/api/http'
import { passkeyApi, registerPasskey, serializePasskey, signInWithPasskey, supportsPasskeys } from './passkeys'

vi.mock('../../shared/api/http', () => ({ request: vi.fn() }))

const rawId = new Uint8Array([1, 2, 3]).buffer
class MockCredential {
  static parseCreationOptionsFromJSON = vi.fn(options => options)
  static parseRequestOptionsFromJSON = vi.fn(options => options)
  id = 'credential-1'
  rawId = rawId
  type = 'public-key'
  authenticatorAttachment = 'platform'
  response = {
    clientDataJSON: new Uint8Array([4, 5]).buffer,
    attestationObject: new Uint8Array([6, 7]).buffer,
    getTransports: () => ['internal']
  }
  getClientExtensionResults() { return {} }
}

describe('Passkey browser ceremony', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('PublicKeyCredential', MockCredential)
    vi.stubGlobal('navigator', { credentials: {
      create: vi.fn(async () => new MockCredential()),
      get: vi.fn(async () => Object.assign(new MockCredential(), {response:{
        clientDataJSON: new Uint8Array([4,5]).buffer,
        authenticatorData: new Uint8Array([8,9]).buffer,
        signature: new Uint8Array([10]).buffer,
        userHandle: null
      }}))
    } })
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('window', { location: {hostname: 'localhost', protocol: 'http:', port: '5173'}, isSecureContext: true })
    vi.mocked(request).mockImplementation(async (path) => {
      if (path.endsWith('/create-options')) return {challenge:'challenge',rp:{id:'localhost'}} as never
      if (path.endsWith('/request-options')) return {challenge:'challenge',rpId:'localhost'} as never
      return undefined as never
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('creates a passkey and sends JSON with base64url-encoded credential values', async () => {
    expect(supportsPasskeys()).toBe(true)
    await registerPasskey('current-password', 'My laptop')
    expect(passkeyApi.createOptions).toBeTypeOf('function')
    const calls = vi.mocked(request).mock.calls
    expect(calls[0]).toEqual(['/api/auth/passkeys/create-options',
      {method:'POST',body:JSON.stringify({currentPassword:'current-password'})}])
    expect(calls[1]?.[0]).toBe('/api/auth/passkeys/register')
    const body = JSON.parse(String(calls[1]?.[1]?.body)) as {credentialJson:string;name:string}
    expect(body.name).toBe('My laptop')
    const serialized = JSON.parse(body.credentialJson) as {rawId:string;response:{attestationObject:string}}
    expect(serialized.rawId).toBe('AQID')
    expect(serialized.response.attestationObject).toBe('Bgc')
  })

  it('signs in with an assertion, without reading a password or username', async () => {
    await signInWithPasskey()
    const calls = vi.mocked(request).mock.calls
    expect(calls[0]?.[0]).toBe('/api/auth/passkeys/request-options')
    expect(calls[1]?.[0]).toBe('/api/auth/passkeys/login')
    const body = JSON.parse(String(calls[1]?.[1]?.body)) as {credentialJson:string}
    const credential = JSON.parse(body.credentialJson) as {response:{signature:string}}
    expect(credential.response.signature).toBe('Cg')
  })

  it('stops before the browser ceremony when the RP domain disagrees with the Vite address', async () => {
    vi.stubGlobal('window', { location: {hostname: '127.0.0.1', protocol: 'http:', port: '5173'}, isSecureContext: true })
    await expect(signInWithPasskey()).rejects.toThrow('http://localhost:5173')
    await expect(registerPasskey('password', 'Laptop')).rejects.toThrow('http://localhost:5173')
    expect(navigator.credentials.get).not.toHaveBeenCalled()
    expect(navigator.credentials.create).not.toHaveBeenCalled()
  })

  it('accepts a trusted parent RP domain for production subdomains', async () => {
    vi.stubGlobal('window', { location: {hostname: 'app.example.com', protocol: 'https:', port: ''}, isSecureContext: true })
    vi.mocked(request).mockImplementation(async path => {
      if (path.endsWith('/request-options')) return {challenge:'challenge',rpId:'example.com'} as never
      return undefined as never
    })
    await signInWithPasskey()
    expect(navigator.credentials.get).toHaveBeenCalledTimes(1)
  })

  it('rejects unsupported browsers and safely handles null assertion data', async () => {
    const encoded = JSON.parse(serializePasskey(Object.assign(new MockCredential(), {response:{
      clientDataJSON:new Uint8Array([1]).buffer,
      authenticatorData:new Uint8Array([2]).buffer,
      signature:new Uint8Array([3]).buffer,
      userHandle:null
    }}) as unknown as PublicKeyCredential)) as {response:{userHandle:null}}
    expect(encoded.response.userHandle).toBeNull()
    vi.stubGlobal('PublicKeyCredential', undefined)
    expect(supportsPasskeys()).toBe(false)
    await expect(signInWithPasskey()).rejects.toThrow('مرورگر')
  })
})
