import { createContext, useContext, useState, type ReactNode } from 'react'
import es from '../i18n/es'
import en from '../i18n/en'
import type { Translations } from '../i18n/es'

type Lang = 'es' | 'en'

interface LangCtx {
  lang:   Lang
  t:      Translations
  toggle: () => void
}

const LangContext = createContext<LangCtx | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('es')
  const toggle = () => setLang(l => l === 'es' ? 'en' : 'es')
  const t = lang === 'es' ? es : en
  return (
    <LangContext.Provider value={{ lang, t, toggle }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be inside LangProvider')
  return ctx
}