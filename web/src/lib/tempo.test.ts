import { describe, expect, it } from 'vitest'
import { tempoRelativo } from './tempo'

const agora = 1_000_000_000_000
describe('tempoRelativo', () => {
  it('escolhe a unidade pelo tamanho do intervalo', () => {
    expect(tempoRelativo(agora - 10_000, agora)).toBe('agora')
    expect(tempoRelativo(agora - 5 * 60_000, agora)).toBe('há 5 min')
    expect(tempoRelativo(agora - 3 * 3_600_000, agora)).toBe('há 3 h')
    expect(tempoRelativo(agora - 24 * 3_600_000, agora)).toBe('ontem')
    expect(tempoRelativo(agora - 4 * 86_400_000, agora)).toBe('há 4 dias')
  })
  it('data no futuro vira agora, e sem registro avisa', () => {
    expect(tempoRelativo(agora + 60_000, agora)).toBe('agora')
    expect(tempoRelativo(0, agora)).toBe('sem registro')
  })
})
