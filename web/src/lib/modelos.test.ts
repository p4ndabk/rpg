import { describe, expect, it } from 'vitest'
import { visaoPublica } from './rede/protocolo'
import { aplicarModelo, cenarioDoModelo, MODELOS, modeloPorId, salaDoModelo, TAMANHOS } from './modelos'
import { adicionarPeca, casaBloqueada, COLUNAS_MAX, COLUNAS_MIN, criarSala, lerSala, LINHAS_MAX, LINHAS_MIN, TERRENOS, terrenoEm } from './sala'
import { comprimirCenario, expandirCenario, lerEventoFoto, montarFoto, TAMANHO_MAXIMO_FOTO } from './nostr/eventos'

describe('terrenos', () => {
  it('cada um tem rótulo, grupo e valor únicos', () => {
    expect(new Set(TERRENOS.map((t) => t.valor)).size).toBe(TERRENOS.length)
    expect(new Set(TERRENOS.map((t) => t.rotulo)).size).toBe(TERRENOS.length)
    expect(TERRENOS.length).toBeGreaterThanOrEqual(20)
  })
})

describe('modelos de mapa', () => {
  it('têm id único e tamanho dentro dos limites', () => {
    expect(new Set(MODELOS.map((m) => m.id)).size).toBe(MODELOS.length)
    for (const m of [...MODELOS, ...TAMANHOS]) {
      expect(m.colunas).toBeGreaterThanOrEqual(COLUNAS_MIN)
      expect(m.colunas).toBeLessThanOrEqual(COLUNAS_MAX)
      expect(m.linhas).toBeGreaterThanOrEqual(LINHAS_MIN)
      expect(m.linhas).toBeLessThanOrEqual(LINHAS_MAX)
    }
  })

  it.each(MODELOS.map((m) => [m.id, m] as const))('%s: monta dentro do grid, sem repetir casa e volta igual do armazenamento', (_id, m) => {
    const sala = salaDoModelo(m, '', 'sala-1234567')
    expect(sala.colunas).toBe(m.colunas)
    expect(sala.linhas).toBe(m.linhas)
    const cenario = sala.cenario ?? []
    expect(new Set(cenario.map((c) => `${c.coluna},${c.linha}`)).size).toBe(cenario.length)
    for (const c of cenario) {
      expect(c.coluna).toBeGreaterThanOrEqual(0)
      expect(c.coluna).toBeLessThan(m.colunas)
      expect(c.linha).toBeGreaterThanOrEqual(0)
      expect(c.linha).toBeLessThan(m.linhas)
    }
    expect(lerSala(JSON.parse(JSON.stringify(sala)))?.cenario?.length ?? 0).toBe(cenario.length)
  })

  it('é determinístico: o mesmo modelo sai igual', () => {
    for (const m of MODELOS) expect(m.montar().cenario).toEqual(m.montar().cenario)
  })

  it('tem ao menos um canto livre para as peças entrarem (a primeira casa livre existe)', () => {
    for (const m of MODELOS) {
      const livre = salaDoModelo(m, '', 'x'.repeat(8))
      expect(adicionarPeca(livre, 'Mago', 'personagem', 'p1').pecas.length, m.id).toBe(1)
    }
  })

  it('o modelo vazio não tem cenário; os outros têm de verdade', () => {
    expect(cenarioDoModelo(modeloPorId('vazio')!)).toHaveLength(0)
    for (const m of MODELOS.filter((x) => x.id !== 'vazio')) expect(cenarioDoModelo(m).length, m.id).toBeGreaterThan(30)
  })

  it('nome vazio usa o do modelo', () => {
    expect(salaDoModelo(modeloPorId('taverna')!, '   ').nome).toBe('Taverna')
    expect(salaDoModelo(modeloPorId('taverna')!, 'Bodega').nome).toBe('Bodega')
  })

  it('aplicar a uma sala troca o cenário, mantém as peças e nunca põe parede em cima de peça', () => {
    const modelo = modeloPorId('taverna')!
    let sala = criarSala('Minha', 12, 8, 'sala-1234567')
    sala = adicionarPeca(sala, 'Mago', 'personagem', 'p1', { coluna: 2, linha: 2 }) // onde o modelo põe uma mesa
    const nova = aplicarModelo(sala, modelo)
    expect(nova.colunas).toBe(18)
    expect(nova.linhas).toBe(12)
    expect(nova.pecas).toHaveLength(1)
    expect(casaBloqueada(nova, 2, 2)).toBe(false)
    expect(terrenoEm(nova, 0, 0)).toBe('parede')
  })

  it('aplicar um modelo menor não encolhe abaixo do que as peças pedem', () => {
    let sala = criarSala('Grande', 30, 20, 'sala-1234567')
    sala = adicionarPeca(sala, 'Orc', 'monstro', 'p1', { coluna: 25, linha: 15 })
    const nova = aplicarModelo(sala, modeloPorId('vazio')!)
    expect(nova.colunas).toBe(26)
    expect(nova.linhas).toBe(16)
  })
})

describe('mapa grande na rede', () => {
  it('comprime e expande o cenário sem perder casa', () => {
    for (const m of MODELOS) {
      const cenario = cenarioDoModelo(m)
      const volta = expandirCenario(comprimirCenario(cenario))
      const chave = (c: { coluna: number; linha: number; terreno: string }) => `${c.linha},${c.coluna},${c.terreno}`
      expect(volta.map(chave).sort()).toEqual(cenario.map(chave).sort())
    }
  })

  it('o maior modelo cabe no limite do evento e volta igual da foto', () => {
    const sala = salaDoModelo(modeloPorId('castelo')!, 'Castelo', 'sala-1234567', 'a'.repeat(64))
    const foto = visaoPublica({ sala, log: [], jogadores: [] })
    const evento = montarFoto(sala.id, 3, foto, 1000)
    expect(evento.content.length).toBeLessThan(TAMANHO_MAXIMO_FOTO)
    const lida = lerEventoFoto(evento as never)!
    expect(lida.foto.sala.cenario?.length).toBe(sala.cenario!.length)
    expect(lida.foto.sala.colunas).toBe(50)
  })

  it('trecho malformado é ignorado', () => {
    expect(expandirCenario('x')).toEqual([])
    expect(expandirCenario([['parede', 'a', 1, 2], ['parede', 1, 5, 2], 7, null])).toEqual([])
  })
})
