import {describe,expect,it} from 'vitest'
import {accountSchema,createUserSchema} from './users.schema'
describe('user administration validation',()=>{
 it('requires valid email',()=>{
  expect(accountSchema.safeParse({email:'invalid'}).success).toBe(false)
  expect(accountSchema.safeParse({email:'someone@example.com'}).success).toBe(true)
 })
 it('requires a strong-length initial password',()=>{
  expect(createUserSchema.safeParse({email:'someone@example.com',password:'12345'}).success).toBe(false)
  expect(createUserSchema.safeParse({email:'someone@example.com',password:'Long-Enough-Password!'}).success).toBe(true)
 })
})
