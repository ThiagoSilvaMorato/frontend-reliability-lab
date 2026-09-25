import { describe, expect, it } from 'vitest'
import en from './en.json'
import ptBR from './pt-BR.json'
import { detectLocale, translate, type MessageKey } from './messages'

function keysOf(tree: object, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : keysOf(value as object, `${prefix}${key}.`),
  )
}

describe('translations', () => {
  it('pt-BR defines exactly the same keys as en', () => {
    expect(keysOf(ptBR).sort()).toEqual(keysOf(en).sort())
  })

  it('has no empty strings', () => {
    for (const [locale, tree] of [
      ['en', en],
      ['pt-BR', ptBR],
    ] as const) {
      const empty = keysOf(tree).filter((key) => {
        const value = key.split('.').reduce<unknown>((n, part) => (n as never)[part], tree)
        return value === ''
      })
      expect(empty, `empty keys in ${locale}`).toEqual([])
    }
  })
})

describe('translate', () => {
  it('returns the message for the locale', () => {
    expect(translate('en', 'errors.retry')).toBe('Try again')
    expect(translate('pt-BR', 'errors.retry')).toBe('Tentar novamente')
  })

  it('interpolates parameters and leaves unknown placeholders visible', () => {
    expect(translate('en', 'errors.badge.http', { status: 503 })).toBe('HTTP 503')
    expect(translate('en', 'errors.badge.http')).toBe('HTTP {status}')
  })

  it('falls back to the key when nothing matches', () => {
    expect(translate('en', 'does.not.exist' as MessageKey)).toBe('does.not.exist')
  })
})

describe('detectLocale', () => {
  it.each([
    [null, 'pt-BR', 'pt-BR'],
    [null, 'pt-PT', 'pt-BR'],
    [null, 'en-US', 'en'],
    [null, 'fr-FR', 'en'],
    ['en', 'pt-BR', 'en'],
    ['pt-BR', 'en-US', 'pt-BR'],
    ['klingon', 'en-US', 'en'],
  ])('stored=%s browser=%s → %s', (stored, browser, expected) => {
    expect(detectLocale(stored, browser)).toBe(expected)
  })
})
