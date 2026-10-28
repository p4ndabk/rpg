import { describe, expect, it } from 'vitest'
import { estaOnline, haQuanto, idadeS, lerVistos, mestreAusente, situacaoDe } from './presenca'

const PK = 'a'.repeat(64)

describe('presença', () => {
  it('conta a idade em segundos e nunca fica negativa', () => {
    expect(idadeS(100_000, 40)).toBe(60)
    expect(idadeS(100_000, 130)).toBe(0)
  })

  it('está online se deu sinal há pouco', () => {
    expect(estaOnline(200_000, 100)).toBe(true)
    expect(estaOnline(400_000, 100)).toBe(false)
    expect(estaOnline(400_000, undefined)).toBe(false)
  })

  it('diz há quanto tempo', () => {
    expect(haQuanto(20)).toBe('agora')
    expect(haQuanto(5 * 60)).toBe('há 5 min')
    expect(haQuanto(2 * 3600)).toBe('há 2 h')
    expect(haQuanto(86_400)).toBe('há 1 dia')
    expect(haQuanto(3 * 86_400)).toBe('há 3 dias')
  })

  it('mestre some depois de 3 minutos sem sinal', () => {
    expect(mestreAusente(100_000 + 170_000, 100)).toBe(false)
    expect(mestreAusente(100_000 + 200_000, 100)).toBe(true)
  })

  it('lê só pubkey → número', () => {
    expect(lerVistos({ [PK]: 123.9, ruim: 5, [`${'b'.repeat(64)}`]: 'x' })).toEqual({ [PK]: 123 })
    expect(lerVistos(null)).toEqual({})
    expect(lerVistos([1])).toEqual({})
  })

  it('situação de cada pessoa na mesa', () => {
    const OUTRA = 'c'.repeat(64)
    const MESTRE = 'd'.repeat(64)
    const eu = PK
    const agoraMs = 1_000_000
    const presenca = { vistos: { [OUTRA]: 950 }, mestreEm: 990, agoraMs }
    expect(situacaoDe(eu, { eu, mestre: MESTRE, presenca })).toEqual({ online: true, texto: 'online' })
    expect(situacaoDe(OUTRA, { eu, mestre: MESTRE, presenca })).toEqual({ online: true, texto: 'online' })
    expect(situacaoDe(MESTRE, { eu, mestre: MESTRE, presenca })).toEqual({ online: true, texto: 'online' })
    const velha = { ...presenca, agoraMs: 1_000_000 + 600_000 }
    expect(situacaoDe(OUTRA, { eu, mestre: MESTRE, presenca: velha })).toEqual({ online: false, texto: 'visto há 10 min' })
    expect(situacaoDe(MESTRE, { eu, mestre: MESTRE, presenca: velha }).online).toBe(false)
    expect(situacaoDe(MESTRE, { eu, mestre: MESTRE, presenca: { ...presenca, mestreEm: null } }).texto).toBe('sem sinal ainda')
    expect(situacaoDe('e'.repeat(64), { eu, mestre: MESTRE, presenca }).texto).toBe('ainda não deu sinal')
  })
})
