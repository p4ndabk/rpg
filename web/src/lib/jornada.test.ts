import { describe, expect, it } from 'vitest'
import { PEDIDO_PADRAO, rolar, type Pedido } from './dados'
import {
  JORNADA_INICIAL,
  lerJornada,
  MISSOES,
  nivelDe,
  progresso,
  proximaMissao,
  registrarEvento,
  XP,
  type Evento,
  type Jornada,
} from './jornada'

const dadoFixo =
  (...valores: number[]) =>
  () =>
    valores.shift()!

const rolagem = (valores: number[], extra: Partial<Pedido> = {}): Evento => ({
  tipo: 'rolagem',
  rolagem: rolar({ ...PEDIDO_PADRAO, ...extra }, dadoFixo(...valores)),
  naSala: false,
})

function aplicar(...eventos: Evento[]) {
  let jornada: Jornada = JORNADA_INICIAL
  const novidades = []
  for (const e of eventos) {
    const r = registrarEvento(jornada, e, 1)
    jornada = r.jornada
    novidades.push(...r.novidades)
  }
  return { jornada, novidades }
}

describe('níveis', () => {
  it('sobem em 100, 300, 600 e 1000 XP', () => {
    expect([0, 99, 100, 299, 300, 600, 1000].map(nivelDe)).toEqual([1, 1, 2, 2, 3, 4, 5])
  })

  it('mostra o progresso até o próximo nível', () => {
    expect(progresso(150)).toMatchObject({ nivel: 2, titulo: 'Andarilho', proximoTitulo: 'Aventureiro', atual: 50, necessario: 200 })
  })

  it('depois do último título, segue subindo de número', () => {
    expect(progresso(100_000)).toMatchObject({ titulo: 'Lenda' })
    expect(progresso(100_000).nivel).toBeGreaterThan(7)
  })
})

describe('registrarEvento', () => {
  it('a primeira rolagem de D20 cumpre a missão e dá o selo', () => {
    const { jornada, novidades } = aplicar(rolagem([12]))
    expect(jornada.missoes['primeiro-d20']).toBeDefined()
    expect(jornada.conquistas['primeira-rolagem']).toBeDefined()
    expect(jornada.xp).toBe(XP.rolagem + XP.missao + XP.conquista)
    expect(novidades.map((n) => n.tipo)).toEqual(['missao', 'conquista'])
    expect(novidades[0]!.texto).toBe('Próxima missão: Role um dado de dano.')
  })

  it('20 natural dá XP extra e o selo, uma vez só', () => {
    const { jornada, novidades } = aplicar(rolagem([20]), rolagem([20]))
    expect(jornada.estatisticas.vinteNaturais).toBe(2)
    expect(novidades.filter((n) => n.titulo === 'Vinte natural')).toHaveLength(1)
  })

  it('1 natural também rende selo', () => {
    expect(aplicar(rolagem([1])).jornada.conquistas['um-natural']).toBeDefined()
  })

  it('sorte dobrada só com os dois 20 na vantagem', () => {
    expect(aplicar(rolagem([20, 7], { modo: 'vantagem' })).jornada.conquistas['sorte-dobrada']).toBeUndefined()
    expect(aplicar(rolagem([20, 20], { modo: 'vantagem' })).jornada.conquistas['sorte-dobrada']).toBeDefined()
  })

  it('golpe perfeito com todos os dados no máximo', () => {
    const e = rolagem([6, 6], { dado: 6, quantidade: 2 })
    expect(aplicar(e).jornada.conquistas['golpe-perfeito']).toBeDefined()
  })

  it('avisa quando sobe de nível', () => {
    const { novidades } = aplicar(rolagem([12]), rolagem([5], { dado: 6 }), { tipo: 'sala-criada' })
    expect(novidades.some((n) => n.tipo === 'nivel' && n.titulo === 'Nível 2: Andarilho')).toBe(true)
  })

  it('cumprir todas as missões dá o selo de primeiros passos', () => {
    const { jornada } = aplicar(
      rolagem([12]),
      rolagem([4], { dado: 6 }),
      { tipo: 'sala-criada' },
      { tipo: 'peca-adicionada', peca: 'personagem', personagens: 1, monstros: 0 },
      { tipo: 'peca-adicionada', peca: 'monstro', personagens: 1, monstros: 1 },
      { tipo: 'peca-movida' },
      { tipo: 'combate-iniciado' },
    )
    expect(Object.keys(jornada.missoes)).toHaveLength(MISSOES.length)
    expect(proximaMissao(jornada)).toBeUndefined()
    expect(jornada.conquistas['jornada']).toBeDefined()
  })

  it('conta estatísticas', () => {
    const { jornada } = aplicar(rolagem([10]), rolagem([20]), rolagem([3, 4], { dado: 8, quantidade: 2, bonus: 2 }))
    expect(jornada.estatisticas).toEqual({
      rolagens: 3,
      testes: 2,
      somaNaturais: 30,
      vinteNaturais: 1,
      umNaturais: 0,
      maiorTotal: 9,
    })
  })
})

describe('lerJornada', () => {
  it('lê de volta o que foi salvo', () => {
    const { jornada } = aplicar(rolagem([20]))
    expect(lerJornada(JSON.parse(JSON.stringify(jornada)))).toEqual(jornada)
  })

  it('ignora selos e missões que não existem e números inválidos', () => {
    expect(lerJornada({ xp: -5, conquistas: { inventado: 1, 'vinte-natural': 2 }, missoes: 'x' })).toEqual({
      ...JORNADA_INICIAL,
      conquistas: { 'vinte-natural': 2 },
    })
    expect(lerJornada(null)).toBeNull()
  })
})
