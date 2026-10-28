import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testarRelay, testarRelays, textoDoResultado, type SoqueteMinimo } from './testarRelays'

/** Um relay de mentira: `roteiro` decide o que ele faz quando abre. */
function fabricaDe(roteiro: (s: SoqueteMinimo) => void) {
  const enviados: string[] = []
  let fechou = 0
  const fabrica = () => {
    const s: SoqueteMinimo = { onopen: null, onmessage: null, onerror: null, onclose: null, send: (d) => enviados.push(d), close: () => void fechou++ }
    queueMicrotask(() => roteiro(s))
    return s
  }
  return { fabrica, enviados, fechou: () => fechou }
}

describe('testarRelay', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('mede o tempo até o fim da lista e fecha a conexão', async () => {
    let t = 1000
    const { fabrica, enviados, fechou } = fabricaDe((s) => {
      s.onopen?.({})
      t = 1230
      s.onmessage?.({ data: JSON.stringify(['EOSE', 'rpg-teste']) })
    })
    const r = await testarRelay('wss://a', { fabrica, agora: () => t })
    expect(r).toEqual({ url: 'wss://a', ms: 230 })
    expect(JSON.parse(enviados[0]!)[0]).toBe('REQ')
    expect(fechou()).toBe(1)
  })

  it('relay mudo estoura o prazo', async () => {
    const { fabrica } = fabricaDe((s) => s.onopen?.({}))
    const promessa = testarRelay('wss://b', { fabrica, limiteMs: 3000 })
    await vi.advanceTimersByTimeAsync(3000)
    expect(await promessa).toEqual({ url: 'wss://b', ms: null, motivo: 'sem-resposta' })
  })

  it('erro de conexão e relay que pede login são reconhecidos', async () => {
    const erro = await testarRelay('wss://c', { fabrica: fabricaDe((s) => s.onerror?.({})).fabrica })
    expect(erro.motivo).toBe('sem-resposta')
    const login = await testarRelay('wss://d', { fabrica: fabricaDe((s) => { s.onopen?.({}); s.onmessage?.({ data: JSON.stringify(['CLOSED', 'rpg-teste', 'auth-required: faça login']) }) }).fabrica })
    expect(login).toEqual({ url: 'wss://d', ms: null, motivo: 'exige-login' })
  })

  it('lixo no meio do caminho é ignorado e fábrica que lança não quebra', async () => {
    const r = await testarRelay('wss://e', { fabrica: fabricaDe((s) => { s.onopen?.({}); s.onmessage?.({ data: 'não é json' }); s.onmessage?.({ data: JSON.stringify(['EVENT', 'x', {}]) }) }).fabrica })
    expect(r.ms).not.toBeNull()
    expect(await testarRelay('wss://f', { fabrica: () => { throw new Error('url ruim') } })).toEqual({ url: 'wss://f', ms: null, motivo: 'sem-resposta' })
  })

  it('testa vários de uma vez e conta a história em português', async () => {
    const rs = await testarRelays(['wss://g', 'wss://h'], { fabrica: fabricaDe((s) => s.onerror?.({})).fabrica })
    expect(rs.map((x) => x.url)).toEqual(['wss://g', 'wss://h'])
    expect(textoDoResultado({ url: 'x', ms: 120 })).toBe('respondeu em 120 ms')
    expect(textoDoResultado({ url: 'x', ms: null, motivo: 'sem-resposta' })).toBe('não respondeu')
    expect(textoDoResultado({ url: 'x', ms: null, motivo: 'exige-login' })).toContain('login')
  })
})
