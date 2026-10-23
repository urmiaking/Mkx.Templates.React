import { z } from 'zod'

export const workItemSchema = z.object({
  title: z.string().trim().min(1, 'عنوان را وارد کنید.').max(120, 'عنوان نباید بیشتر از ۱۲۰ کاراکتر باشد.')
})

export type WorkItem = {
  id: string
  title: string
  isComplete: boolean
  version: number
  createdAt: string
}

export type WorkItemPage = { items: WorkItem[]; total: number }
