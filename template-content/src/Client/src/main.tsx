import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './app/App'
import { ToastProvider } from './shared/ui/ToastProvider'
import './shared/ui/ui.css'
import './styles.css'
import './features/account/account.css'
import './features/account/mfa.css'
import './features/account/passkeys.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider><BrowserRouter><App /></BrowserRouter></ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
