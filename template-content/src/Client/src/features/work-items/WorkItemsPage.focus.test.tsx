import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { WorkItemsPage } from './WorkItemsPage'

vi.mock('./work-item.api', () => ({
  workItemApi: {
    list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    create: vi.fn(), update: vi.fn(), delete: vi.fn()
  }
}))
vi.mock('../../shared/ui/useToast', () => ({ useToast: () => ({ show: vi.fn() }) }))

function LocationQuery() {
  const location = useLocation()
  return <output data-testid="location-query">{location.search}</output>
}

describe('mobile create shortcut', () => {
  it('focuses the actual editor and consumes the create query', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/work-items?create=1']}>
        <WorkItemsPage canManage/>
        <LocationQuery/>
      </MemoryRouter>
    </QueryClientProvider>)

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'عنوان کار' })).toHaveFocus()
      expect(screen.getByTestId('location-query')).toHaveTextContent(/^$/)
    })
  })
})
