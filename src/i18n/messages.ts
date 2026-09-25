import en from './en.json'
import ptBR from './pt-BR.json'

// `en.json` is the source of truth for keys: `pt-BR.json` must have the same shape to compile.
type Messages = typeof en
const pt: Messages = ptBR

type LeafPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${LeafPaths<T[K]>}`
}[keyof T & string]

export type MessageKey = LeafPaths<Messages>
export type MessageParams = Record<string, string | number>

export const LOCALES = ['en', 'pt-BR'] as const
export type Locale = (typeof LOCALES)[number]

export const messages: Record<Locale, Messages> = { en, 'pt-BR': pt }

function lookup(tree: unknown, key: string): string | undefined {
  let node = tree
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

/** Missing translations fall back to English, then to the key itself, so the UI never renders blank. */
export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  const template = lookup(messages[locale], key) ?? lookup(messages.en, key) ?? key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  )
}

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale === value)
}

/** A stored choice wins; otherwise follow the browser language. */
export function detectLocale(stored: string | null, browserLanguage: string): Locale {
  if (isLocale(stored)) return stored
  return browserLanguage.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}
