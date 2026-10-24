import { z } from 'zod'

export const passwordSchema = z.string().min(12, 'رمز عبور باید حداقل ۱۲ نویسه داشته باشد.')
  .regex(/[A-Z]/, 'حداقل یک حرف بزرگ انگلیسی لازم است.')
  .regex(/[a-z]/, 'حداقل یک حرف کوچک انگلیسی لازم است.')
  .regex(/[0-9]/, 'حداقل یک عدد لازم است.')
  .regex(/[^A-Za-z0-9]/, 'حداقل یک نویسه ویژه لازم است.')

export const profileSchema = z.object({
  userName: z.string().trim().min(1, 'نام کاربری الزامی است.').max(128, 'نام کاربری بیش از حد طولانی است.'),
  email: z.email('ایمیل معتبر وارد کنید.')
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'رمز فعلی الزامی است.'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword,
  { path: ['confirmPassword'], message: 'تکرار رمز با رمز جدید یکسان نیست.' })

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword,
  { path: ['confirmPassword'], message: 'تکرار رمز با رمز جدید یکسان نیست.' })
