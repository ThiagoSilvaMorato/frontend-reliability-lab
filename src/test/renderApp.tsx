import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, type RouteObject } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { AppProviders } from '@/AppProviders'
import { createQueryClient } from '@/api/queryClient'
import { appRoutes } from '@/routes'

interface RenderAppOptions {
  route?: string
  routes?: RouteObject[]
}

/** Renders the real providers and routes with an in-memory history and near-zero retry delay. */
export function renderApp({ route = '/', routes = appRoutes }: RenderAppOptions = {}) {
  const queryClient = createQueryClient({ retryDelay: () => 1 })
  const router = createMemoryRouter(routes, { initialEntries: [route] })
  render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { router, queryClient, user: userEvent.setup() }
}
