import { expect, test } from '@playwright/test'

/**
 * These scenarios never call the real PokéAPI (they answer or fail before reaching an upstream), so
 * they are deterministic without depending on outbound network access in CI. See ADR 0008.
 */

test.describe('HTTP 500: retries, then recovers without a reload', () => {
  test('shared link starts the scenario before the first request', async ({ page }) => {
    await page.goto('/?scenario=http500')

    const alert = page.getByRole('alert')
    await expect(alert).toContainText('HTTP 500')
    await expect(alert).toContainText('The server had a problem')
    await expect(page.getByRole('link', { name: 'Simulating: HTTP 500' })).toBeVisible()
  })

  test('clicking Try again recovers once the scenario is switched back to Normal', async ({
    page,
  }) => {
    // Stays on the Lab page throughout: navigating away and back would remount the query and
    // TanStack Query would refetch it on mount by itself, recovering before "Try again" is ever
    // clicked. The live probe uses the exact same ErrorState/QueryView as the rest of the app.
    await page.goto('/lab?scenario=http500')
    await expect(page.getByRole('alert')).toContainText('HTTP 500')

    // Cache reset on scenario change is on by default and would also recover the probe on its own;
    // turning it off isolates the manual retry path this test is about.
    await page
      .getByRole('checkbox', { name: 'Reset cached data when the scenario changes' })
      .uncheck()
    await page.getByRole('radio', { name: /^Normal/ }).click()
    // Changing the scenario alone does not touch the cache: the error is still on screen.
    await expect(page.getByRole('alert')).toContainText('HTTP 500')

    await page.getByRole('button', { name: 'Try again' }).click()

    // Exact + case-sensitive: `getByText` is case-insensitive by default and would also match the
    // request log's "GET /pokemon/pikachu" row.
    await expect(page.getByText(/^Pikachu$/)).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})

test('HTTP 404: fails once, offers no retry', async ({ page }) => {
  await page.goto('/pokemon/missingno?scenario=http404')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('HTTP 404')
  await expect(alert).toContainText('Not found')
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0)
})

test('network error: retried like a server error, but reported as a connection problem', async ({
  page,
}) => {
  await page.goto('/?scenario=network')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Network error')
  await expect(alert).toContainText('Connection problem')
})

test('timeout: every attempt gives up after the real client timeout, then the error is handled', async ({
  page,
}) => {
  test.slow() // three real 6s timeouts plus backoff, close to a minute end to end

  await page.goto('/?scenario=timeout')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Timeout', { timeout: 25_000 })
  await expect(alert).toContainText('The server took too long')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
})
