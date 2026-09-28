import { lazy, Suspense } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppLayout } from '@/components/shared/AppLayout/AppLayout'
import { RouteFallback } from '@/components/shared/RouteFallback/RouteFallback'
import { NotFoundPage } from '@/pages/NotFoundPage/NotFoundPage'
import { PokedexPage } from '@/pages/PokedexPage/PokedexPage'
import { PokemonDetailPage } from '@/pages/PokemonDetailPage/PokemonDetailPage'

/*
 * The Lab is a separate, optional part of the product (see ADR 0009): most sessions likely only ever
 * browse the Pokédex, so its ~19 KB of source (scenario picker, request log, live probe, ...) is
 * loaded on demand instead of shipping in the bundle everyone downloads to see a Pokémon list.
 */
const LabPage = lazy(() =>
  import('@/pages/LabPage/LabPage').then((module) => ({ default: module.LabPage })),
)

// Exported as plain data so tests can mount the same routes in a memory router.
export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <PokedexPage /> },
      { path: 'pokemon/:name', element: <PokemonDetailPage /> },
      {
        path: 'lab',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <LabPage />
          </Suspense>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const createAppRouter = () => createBrowserRouter(appRoutes)
