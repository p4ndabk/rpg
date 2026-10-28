import { describe, expect, it } from 'vitest'
import { chaveDaSala, desproteger, ehProtegida, proteger } from './protegida'

const modelo = { kind: 30078, created_at: 100, tags: [['d', 'rpg:s1']], content: '{"segredo":"o ladrão está na adega"}' }
const k = (senha: string, sala = 's1') => chaveDaSala(senha, sala, 1000)

describe('sala com senha', () => {
  it('tranca o conteúdo, marca o evento e deixa as etiquetas abertas', async () => {
    const p = await proteger(modelo, await k('abre-te'))
    expect(ehProtegida(p)).toBe(true)
    expect(p.content).not.toContain('ladrão')
    expect(p.tags).toContainEqual(['d', 'rpg:s1'])
  })

  it('abre com a senha certa', async () => {
    const p = await proteger(modelo, await k('abre-te'))
    expect((await desproteger(p, await k('abre-te')))?.content).toBe(modelo.content)
  })

  it('não abre com a senha errada, sem senha, nem com a senha de outra sala', async () => {
    const p = await proteger(modelo, await k('abre-te'))
    expect(await desproteger(p, await k('fecha-te'))).toBeNull()
    expect(await desproteger(p, null)).toBeNull()
    expect(await desproteger(p, await k('abre-te', 'outra-sala'))).toBeNull()
  })

  it('sem senha o evento aberto passa; com senha ele é recusado (ninguém se passa por quem sabe)', async () => {
    expect(await desproteger(modelo, null)).toEqual(modelo)
    expect(await desproteger(modelo, await k('abre-te'))).toBeNull()
  })
})
