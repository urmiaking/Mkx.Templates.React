import { request } from '../../shared/api/http'

export type PasskeySummary = { credentialId: string; name: string; createdAt: string; isBackedUp: boolean }

export const passkeyApi = {
  list: () => request<PasskeySummary[]>('/api/auth/passkeys'),
  createOptions: (currentPassword: string) =>
    request<PublicKeyCredentialCreationOptionsJSON>('/api/auth/passkeys/create-options',
      { method: 'POST', body: JSON.stringify({ currentPassword }) }),
  register: (credentialJson: string, name: string) =>
    request<void>('/api/auth/passkeys/register',
      { method: 'POST', body: JSON.stringify({ credentialJson, name }) }),
  remove: (credentialId: string, currentPassword: string) =>
    request<void>('/api/auth/passkeys/remove',
      { method: 'POST', body: JSON.stringify({ credentialId, currentPassword }) }),
  requestOptions: () => request<PublicKeyCredentialRequestOptionsJSON>('/api/auth/passkeys/request-options',
    { method: 'POST' }),
  signIn: (credentialJson: string) => request<void>('/api/auth/passkeys/login',
    { method: 'POST', body: JSON.stringify({ credentialJson }) })
}

export function supportsPasskeys() {
  return typeof PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials?.create === 'function' &&
    typeof navigator.credentials?.get === 'function' &&
    typeof PublicKeyCredential.parseCreationOptionsFromJSON === 'function' &&
    typeof PublicKeyCredential.parseRequestOptionsFromJSON === 'function' &&
    (typeof window === 'undefined' || window.isSecureContext !== false)
}

function base64url(value: ArrayBuffer | null | undefined) {
  if (!value) return null
  const bytes = new Uint8Array(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

// WebAuthn RP IDs must match the page's actual hostname (or a parent domain).
// Vite's development proxy can otherwise serve localhost RP options on 127.0.0.1.
function ensurePasskeyDomain(rpId: string | undefined) {
  if (!rpId || typeof window === 'undefined') return
  const domain = rpId.toLowerCase()
  const hostname = window.location.hostname.toLowerCase()
  const ipAddress = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(domain) || domain.includes(':')
  if (!ipAddress && (hostname === domain || hostname.endsWith(`.${domain}`))) return
  const localUrl = domain === 'localhost'
    ? ` ${window.location.protocol}//localhost${window.location.port ? `:${window.location.port}` : ''}`
    : ''
  throw new Error(`دامنهٔ Passkey با آدرس فعلی سازگار نیست. ${localUrl
    ? `برای استفاده از Passkey صفحه را از${localUrl} باز کنید.`
    : `دامنهٔ تعریف‌شده در سرور (${rpId}) را با آدرس سایت هماهنگ کنید.`}`)
}

// Explicit serialization is compatible with password managers where invoking
// PublicKeyCredential.toJSON through JSON.stringify throws Illegal invocation.
export function serializePasskey(credential: PublicKeyCredential) {
  const response = credential.response
  const common = {
    id: credential.id,
    rawId: base64url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.getClientExtensionResults()
  }
  if ('attestationObject' in response) {
    const attestation = response as AuthenticatorAttestationResponse
    return JSON.stringify({
      ...common,
      response: {
        clientDataJSON: base64url(response.clientDataJSON),
        attestationObject: base64url(attestation.attestationObject),
        transports: attestation.getTransports?.() ?? []
      }
    })
  }
  const assertion = response as AuthenticatorAssertionResponse
  return JSON.stringify({
    ...common,
    response: {
      clientDataJSON: base64url(response.clientDataJSON),
      authenticatorData: base64url(assertion.authenticatorData),
      signature: base64url(assertion.signature),
      userHandle: base64url(assertion.userHandle)
    }
  })
}

export async function registerPasskey(currentPassword: string, name: string) {
  if (!supportsPasskeys()) throw new Error('مرورگر یا اتصال فعلی از Passkey پشتیبانی نمی‌کند.')
  const options = await passkeyApi.createOptions(currentPassword)
  ensurePasskeyDomain(options.rp?.id)
  const credential = await navigator.credentials.create({
    publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options)
  })
  if (!(credential instanceof PublicKeyCredential)) throw new Error('ثبت Passkey لغو شد.')
  await passkeyApi.register(serializePasskey(credential), name)
}

export async function signInWithPasskey() {
  if (!supportsPasskeys()) throw new Error('برای ورود با Passkey به مرورگر سازگار و اتصال امن نیاز است.')
  const options = await passkeyApi.requestOptions()
  ensurePasskeyDomain(options.rpId)
  const credential = await navigator.credentials.get({
    publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options)
  })
  if (!(credential instanceof PublicKeyCredential)) throw new Error('ورود با Passkey لغو شد.')
  await passkeyApi.signIn(serializePasskey(credential))
}
