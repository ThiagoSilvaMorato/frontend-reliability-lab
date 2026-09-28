import { expect, test } from '@playwright/test'

test('keyboard users can skip the navigation, and focus is visible', async ({ page }) => {
  await page.goto('/')

  await page.keyboard.press('Tab')

  const skipLink = page.getByRole('link', { name: 'Skip to content' })
  await expect(skipLink).toBeFocused()
  // A real focus ring, not just DOM focus: the CSS reset that removes the default outline must be
  // paired with :focus-visible providing its own, or keyboard users lose the indicator entirely.
  await expect(skipLink).toHaveCSS('box-shadow', /rgb/)
})

test('browsing a Pokémon and back preserves the page and scroll target', async ({ page }) => {
  await page.goto('/?page=2')
  await expect(page.getByText('Page 2 of')).toBeVisible()

  await page.getByRole('link', { name: /Spearow/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Spearow' })).toBeVisible()
  await expect(page).toHaveURL(/\/pokemon\/spearow$/)

  await page.getByRole('link', { name: 'Back to the Pokédex' }).click()

  await expect(page).toHaveURL(/\?page=2$/)
  await expect(page.getByText('Page 2 of')).toBeVisible()
})

test('the browser back button works like a real link, not just the in-app back link', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('link', { name: /Bulbasaur/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Bulbasaur' })).toBeVisible()

  await page.goBack()

  await expect(page.getByRole('heading', { level: 1, name: 'Pokédex' })).toBeVisible()
})

test('switching language persists across a reload', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Português (Brasil)' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pokédex' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')

  await page.reload()

  await expect(page.getByRole('button', { name: 'Português (Brasil)' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
})

test('an unknown URL shows a not-found page with a way back', async ({ page }) => {
  await page.goto('/does-not-exist')

  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()

  await page.getByRole('link', { name: 'Back to the Pokédex' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Pokédex' })).toBeVisible()
})
