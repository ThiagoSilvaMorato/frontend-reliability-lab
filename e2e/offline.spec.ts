import { expect, test } from '@playwright/test'

/**
 * `context.setOffline` cuts the browser's network layer for real, unlike the RTL suite (jsdom has
 * no real network to cut, so it drives `onlineManager.setOnline` directly) — see ADR 0008. The
 * scenario is Normal, so this exercises the real PokéAPI and the real online/offline browser events
 * TanStack Query listens to.
 */
test('connection lost mid-session: request fails, offline is shown, reconnecting recovers on its own', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /Bulbasaur/ })).toBeVisible()

  await context.setOffline(true)
  // A Pokémon not already cached, so its query has to actually attempt a request while offline.
  await page.getByRole('link', { name: /Charmander/ }).click()

  await expect(page.getByText('Waiting for a connection')).toBeVisible()
  await expect(page.getByText('You are offline')).toBeVisible()
  // Paused, not failed: no error state for a connectivity problem the app already announced.
  await expect(page.getByRole('alert')).toHaveCount(0)

  await context.setOffline(false)

  await expect(page.getByRole('heading', { level: 1, name: 'Charmander' })).toBeVisible()
  await expect(page.getByText('You are offline')).toHaveCount(0)
})

// Going offline before the app has ever loaded also blocks its own JS/CSS (this is a plain SPA, not
// an installable app with an offline shell), so that case is not this app's concern to handle.
