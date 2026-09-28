import { expect, test } from '@playwright/test'

/**
 * Unlike reliability.spec.ts, these scenarios call the real PokéAPI in the browser: `malformed`
 * corrupts a real response body, `flaky`'s recovery attempt and `slow`'s delayed one both let a real
 * request through (see ADR 0007, "Healthy responses pass through fetch again"). They need outbound
 * network access to pokeapi.co; see ADR 0008 for why that trade-off was accepted here.
 */

test('malformed: a real 200 response is corrupted, rejected by validation, and never auto-retried', async ({
  page,
}) => {
  // Not pikachu: the Lab's own live probe always queries pikachu, and navigating there would mount
  // a second, independent observer of that same query — a race with this test's own assertions,
  // not a bug in the app.
  await page.goto('/pokemon/charmander?scenario=malformed')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Malformed response')
  await expect(alert).toContainText('Unexpected response')
  // The retry policy never auto-retries malformed (the same body would fail again), but the user
  // can still choose to ask again — that button click is what the request log below verifies made
  // no second request.
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()

  await page.getByRole('link', { name: 'Simulating: Malformed response' }).click()
  const row = page.getByRole('row').filter({ hasText: 'charmander' })
  await expect(row).toHaveCount(1)
  // Exact: durations happen to render as "<n> ms", so a fast-enough real request (e.g. "200 ms")
  // would otherwise match the status cell too.
  await expect(row.getByRole('cell', { name: '200', exact: true })).toBeVisible()
  await expect(row).toContainText('Malformed')
})

test('flaky: the first two real attempts fail, the third recovers, and the Lab shows it', async ({
  page,
}) => {
  await page.goto('/lab?scenario=flaky')

  await expect(page.getByText(/^Pikachu$/)).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('row').filter({ hasText: '503' })).toHaveCount(2)
  await expect(page.getByText(/succeeded after 2 failed attempts/)).toBeVisible()
})

test('slow: a real response still arrives, just after the configured delay', async ({ page }) => {
  await page.goto('/lab?scenario=slow')

  // `status` is not a "name from content" ARIA role, so it never gets an accessible name from its
  // sr-only text alone; matching the role (there is only one on this page) is what the text needs.
  await expect(page.getByRole('status')).toBeVisible()
  await expect(page.getByText(/^Pikachu$/)).toBeVisible({ timeout: 10_000 })
  const row = page.getByRole('row').filter({ hasText: 'pikachu' })
  const durationMs = Number((await row.getByRole('cell').last().textContent())?.replace(' ms', ''))
  expect(durationMs).toBeGreaterThan(2_000)
})
