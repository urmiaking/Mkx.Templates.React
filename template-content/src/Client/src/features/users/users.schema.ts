import {z} from 'zod'
export const accountSchema=z.object({userName:z.string().trim().min(3,'نام کاربری حداقل ۳ کاراکتر باشد.').max(128),email:z.email('ایمیل معتبر وارد کنید.').max(256,'ایمیل بیش از حد طولانی است.')})
export const createUserSchema=accountSchema.extend({password:z.string().min(12,'رمز عبور باید حداقل ۱۲ کاراکتر باشد.')})
