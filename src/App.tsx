import { RouterProvider } from 'react-router/dom'
import { AppProviders } from '@/AppProviders'
import { createQueryClient } from '@/api/queryClient'
import { createAppRouter } from '@/routes'

const queryClient = createQueryClient()
const router = createAppRouter()

export function App() {
  return (
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
