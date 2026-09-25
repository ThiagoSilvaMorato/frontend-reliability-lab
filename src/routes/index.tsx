import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppLayout } from '@/components/shared/AppLayout/AppLayout'
import { LabPage } from '@/pages/LabPage/LabPage'
import { NotFoundPage } from '@/pages/NotFoundPage/NotFoundPage'
import { PokedexPage } from '@/pages/PokedexPage/PokedexPage'
import { PokemonDetailPage } from '@/pages/PokemonDetailPage/PokemonDetailPage'

// Exported as plain data so tests can mount the same routes in a memory router.
export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <PokedexPage /> },
      { path: 'pokemon/:name', element: <PokemonDetailPage /> },
      { path: 'lab', element: <LabPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const createAppRouter = () => createBrowserRouter(appRoutes)
