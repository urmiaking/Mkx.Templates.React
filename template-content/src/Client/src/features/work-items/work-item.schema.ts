import { z } from 'zod'
import type { components } from '../../shared/api/schema.generated'

export const workItemSchema = z.object({
  title: z.string().trim().min(1, 'عنوان را وارد کنید.').max(120, 'عنوان نباید بیشتر از ۱۲۰ کاراکتر باشد.')
})

export type WorkItem = components['schemas']['WorkItemDto']
export type WorkItemPage = components['schemas']['WorkItemsPage']
