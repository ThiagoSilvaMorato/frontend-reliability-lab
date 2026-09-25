import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  detectLocale,
  translate,
  type Locale,
  type MessageKey,
  type MessageParams,
} from './messages'

const STORAGE_KEY = 'frl.locale'

interface I18nValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, params?: MessageParams) => string
}

const I18nContext = createContext<I18nValue | null>(null)

// Storage can throw (private mode, blocked site data); the app must work without it.
function readStoredLocale() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function storeLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // preference simply will not persist
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(() =>
    detectLocale(readStoredLocale(), navigator.language),
  )

  // Keeps <html lang> in sync so screen readers pronounce the content correctly.
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value: I18nValue = {
    locale,
    setLocale: (next) => {
      storeLocale(next)
      setLocaleState(next)
    },
    t: (key, params) => translate(locale, key, params),
  }

  return <I18nContext value={value}>{children}</I18nContext>
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>')
  return value
}
