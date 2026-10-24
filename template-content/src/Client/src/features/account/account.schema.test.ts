import { describe, expect, it } from 'vitest'
import { changePasswordSchema, passwordSchema, profileSchema, resetPasswordSchema } from './account.schema'

describe('account self-service validation', () => {
  it('requires a strong password compatible with Identity policy', () => {
    expect(passwordSchema.safeParse('too-short').success).toBe(false)
    expect(passwordSchema.safeParse('alllowercase123!').success).toBe(false)
    expect(passwordSchema.safeParse('Strong-Testing-123!').success).toBe(true)
  })
  it('checks matching confirmation and independent usernames/emails', () => {
    expect(changePasswordSchema.safeParse({
      currentPassword: 'old', newPassword: 'Strong-Testing-123!', confirmPassword: 'different'
    }).success).toBe(false)
    expect(resetPasswordSchema.safeParse({
      newPassword: 'Strong-Testing-123!', confirmPassword: 'Strong-Testing-123!'
    }).success).toBe(true)
    expect(profileSchema.safeParse({ userName: 'member01', email: 'member@example.com' }).success).toBe(true)
    expect(profileSchema.safeParse({ userName: '', email: 'not-an-email' }).success).toBe(false)
  })
})
