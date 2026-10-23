import { describe, expect, it } from 'vitest'
import { workItemSchema } from './work-item.schema'

describe('workItemSchema', () => {
  it('rejects an empty title', () => expect(workItemSchema.safeParse({ title: '  ' }).success).toBe(false))
  it('trims a valid title', () => expect(workItemSchema.parse({ title: '  Build UI  ' }).title).toBe('Build UI'))
  it('rejects an oversized title', () => expect(workItemSchema.safeParse({ title: 'a'.repeat(121) }).success).toBe(false))
})
