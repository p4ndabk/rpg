import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CHAVE_SOM, lerLigado, somLigado } from './preferencias'

describe('preferências', () => {
  const guardado = new Map<string, string>()
  beforeEach(() => {
    guardado.clear()
    globalThis.localStorage = {
      getItem: (k: string) => guardado.get(k) ?? null,
      setItem: (k: string, v: string) => void guardado.set(k, v),
      removeItem: (k: string) => void guardado.delete(k),
    } as unknown as Storage
  })
  afterEach(() => void (globalThis.localStorage = undefined as unknown as Storage))

  it('lê só booleano', () => {
    expect(lerLigado(true)).toBe(true)
    expect(lerLigado(false)).toBe(false)
    expect(lerLigado('sim')).toBeNull()
  })

  it('o som vem ligado e respeita o que a pessoa escolheu', () => {
    expect(somLigado()).toBe(true)
    guardado.set(CHAVE_SOM, 'false')
    expect(somLigado()).toBe(false)
    guardado.set(CHAVE_SOM, '"lixo"')
    expect(somLigado()).toBe(true)
  })
})
