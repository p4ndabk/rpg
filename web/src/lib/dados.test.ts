import { describe, expect, it } from 'vitest'
import {
  descrever,
  ehDanoMaximo,
  faixa,
  FACES,
  margem,
  noHistorico,
  noMomento,
  pedidoDe,
  rolagemAvulsa,
  lerHistorico,
  lerPedido,
  nomeDificuldade,
  notacao,
  PEDIDO_PADRAO,
  rolar,
  rolarDado,
  type Pedido,
} from './dados'

const pedido = (extra: Partial<Pedido> = {}): Pedido => ({
  ...PEDIDO_PADRAO,
  rotulo: 'Furtividade',
  modificador: 3,
  ...extra,
})

/** Devolve os valores na ordem, como um dado viciado de teste. */
const dadoFixo =
  (...valores: number[]) =>
  () =>
    valores.shift()!

describe('rolarDado', () => {
  for (const faces of FACES.filter((f) => f <= 20)) {
    it(`d${faces} fica entre 1 e ${faces} e cobre todas as faces`, () => {
      const vistos = new Set<number>()
      for (let i = 0; i < faces * 300; i++) {
        const n = rolarDado(faces)
        expect(n).toBeGreaterThanOrEqual(1)
        expect(n).toBeLessThanOrEqual(faces)
        vistos.add(n)
      }
      expect(vistos.size).toBe(faces)
    })
  }

  for (const faces of [100, 1000]) {
    it(`d${faces} fica entre 1 e ${faces}`, () => {
      for (let i = 0; i < 5000; i++) {
        const n = rolarDado(faces)
        expect(Number.isInteger(n) && n >= 1 && n <= faces).toBe(true)
      }
    })
  }
})

describe('rolar d20 (teste)', () => {
  it('soma o modificador e compara com a CD', () => {
    expect(rolar(pedido(), dadoFixo(12))).toMatchObject({ tipo: 'teste', natural: 12, total: 15, desfecho: 'sucesso' })
    expect(rolar(pedido(), dadoFixo(11))).toMatchObject({ total: 14, desfecho: 'falha' })
    expect(rolar(pedido({ modificador: -2 }), dadoFixo(17))).toMatchObject({ total: 15, desfecho: 'sucesso' })
  })

  it('20 natural é sucesso crítico mesmo abaixo da CD', () => {
    expect(rolar(pedido({ cd: 30, modificador: 0 }), dadoFixo(20))).toMatchObject({ desfecho: 'sucesso-critico' })
  })

  it('1 natural é falha crítica mesmo acima da CD', () => {
    expect(rolar(pedido({ cd: 5, modificador: 10 }), dadoFixo(1))).toMatchObject({ desfecho: 'falha-critica' })
  })

  it('vantagem rola dois e fica com o maior', () => {
    expect(rolar(pedido({ modo: 'vantagem' }), dadoFixo(4, 18))).toMatchObject({ dados: [4, 18], natural: 18 })
  })

  it('desvantagem rola dois e fica com o menor', () => {
    expect(rolar(pedido({ modo: 'desvantagem' }), dadoFixo(4, 18))).toMatchObject({ natural: 4, desfecho: 'falha' })
  })

  it('desvantagem com um 20 e um 1 é falha crítica', () => {
    expect(rolar(pedido({ modo: 'desvantagem' }), dadoFixo(20, 1))).toMatchObject({ desfecho: 'falha-critica' })
  })

  it('ignora a quantidade: d20 é sempre um dado (ou dois com vantagem)', () => {
    expect(rolar(pedido({ quantidade: 5 }), dadoFixo(10)).dados).toHaveLength(1)
  })
})

describe('rolar outros dados (soma)', () => {
  it('rola a quantidade pedida do dado escolhido e soma o bônus', () => {
    const pedidos: number[] = []
    const sortear = (faces: number) => (pedidos.push(faces), [4, 5][pedidos.length - 1]!)
    const r = rolar(pedido({ dado: 6, quantidade: 2, bonus: 3 }), sortear)
    expect(pedidos).toEqual([6, 6])
    expect(r).toMatchObject({ tipo: 'soma', faces: 6, dados: [4, 5], bonus: 3, total: 12 })
  })

  it('não usa CD nem modificador do teste', () => {
    const r = rolar(pedido({ dado: 8, modificador: 10, bonus: 0 }), dadoFixo(7))
    expect(r).toMatchObject({ total: 7 })
    expect(r).not.toHaveProperty('cd')
  })

  it('aceita bônus negativo', () => {
    expect(rolar(pedido({ dado: 4, quantidade: 1, bonus: -2 }), dadoFixo(3)).total).toBe(1)
  })
})

describe('textos', () => {
  it('notação', () => {
    expect(notacao(2, 6, 3)).toBe('2D6 + 3')
    expect(notacao(1, 100)).toBe('1D100')
    expect(notacao(1, 8, -1)).toBe('1D8 − 1')
  })

  it('faixa de uma soma', () => {
    expect(faixa(pedido({ dado: 6, quantidade: 2, bonus: 3 }))).toEqual([5, 15])
  })

  it('descreve somas e testes', () => {
    expect(descrever(rolar(pedido({ dado: 6, quantidade: 2, bonus: 3 }), dadoFixo(4, 5)))).toBe('4 + 5 + 3 = 12')
    expect(descrever(rolar(pedido({ dado: 6, quantidade: 2 }), dadoFixo(4, 5)))).toBe('4 + 5 = 9')
    expect(descrever(rolar(pedido({ dado: 100 }), dadoFixo(73)))).toBe('73')
    expect(descrever(rolar(pedido(), dadoFixo(12)))).toBe('12 + 3 = 15')
  })

  it('nomes de dificuldade do BG3', () => {
    expect(nomeDificuldade(5)).toBe('Muito fácil')
    expect(nomeDificuldade(12)).toBe('Média')
    expect(nomeDificuldade(30)).toBe('Quase impossível')
  })
})

describe('margem, repetir e histórico', () => {
  it('diz quanto passou ou faltou', () => {
    const teste = (n: number, extra: Partial<Pedido> = {}) => {
      const r = rolar(pedido(extra), dadoFixo(n))
      if (r.tipo !== 'teste') throw new Error('esperava teste')
      return margem(r)
    }
    expect(teste(15)).toBe('Passou por 3.')
    expect(teste(12)).toBe('Passou na conta exata.')
    expect(teste(10)).toBe('Faltou 2.')
    expect(teste(20)).toBe('20 natural: passa sempre!')
    expect(teste(1)).toBe('1 natural: falha sempre.')
  })

  it('dano máximo só com dois dados ou mais, todos no máximo', () => {
    expect(ehDanoMaximo(rolar(pedido({ dado: 6, quantidade: 2 }), dadoFixo(6, 6)))).toBe(true)
    expect(ehDanoMaximo(rolar(pedido({ dado: 6, quantidade: 2 }), dadoFixo(6, 5)))).toBe(false)
    expect(ehDanoMaximo(rolar(pedido({ dado: 6 }), dadoFixo(6)))).toBe(false)
  })

  it('repetir traz de volta os ajustes da rolagem', () => {
    const soma = rolar(pedido({ dado: 8, quantidade: 3, bonus: 2, rotulo: 'Bola de fogo' }), dadoFixo(1, 2, 3))
    expect(pedidoDe(soma, PEDIDO_PADRAO)).toMatchObject({ dado: 8, quantidade: 3, bonus: 2, rotulo: 'Bola de fogo' })
    const teste = rolar(pedido({ cd: 22, modo: 'desvantagem' }), dadoFixo(5, 9))
    expect(pedidoDe(teste, { ...PEDIDO_PADRAO, dado: 6 })).toMatchObject({ dado: 20, cd: 22, modo: 'desvantagem', modificador: 3 })
  })

  it('o histórico põe a mais nova em cima e guarda no máximo 50', () => {
    const r = (n: number) => rolar(pedido({ dado: 6 }), dadoFixo(n))
    const [a, b] = [r(1), r(2)]
    expect(noHistorico([a], b)[0]).toBe(b)
    expect(noHistorico([], a, b)).toEqual([b, a])
    expect(noHistorico(Array.from({ length: 50 }, () => a), b)).toHaveLength(50)
  })

  it('rolagem avulsa soma os dados e o bônus', () => {
    expect(rolagemAvulsa('Iniciativa: Goblin', 20, [14])).toMatchObject({ tipo: 'soma', faces: 20, total: 14 })
  })
})

describe('leitura do que está salvo', () => {
  it('lê de volta um histórico gerado por rolar', () => {
    const historico = [rolar(pedido(), dadoFixo(10)), rolar(pedido({ dado: 12, quantidade: 3 }), dadoFixo(1, 2, 3))]
    expect(lerHistorico(JSON.parse(JSON.stringify(historico)))).toEqual(historico)
  })

  it('converte rolagens da primeira versão, que só tinha d20', () => {
    const antiga = {
      id: 'a',
      teste: 'Furtividade',
      cd: 15,
      modificador: 3,
      modo: 'normal',
      dados: [17],
      natural: 17,
      total: 20,
      desfecho: 'sucesso',
      quando: 1,
    }
    const { teste, ...resto } = antiga
    expect(lerHistorico([antiga])).toEqual([{ ...resto, rotulo: teste, tipo: 'teste', faces: 20 }])
  })

  it('guarda a rodada e a iniciativa, e lê rolagens sem esses campos', () => {
    const solta = rolar(pedido(), dadoFixo(10))
    const naRodada = noMomento(solta, { rodada: 2 })
    const inicio = noMomento(rolagemAvulsa('Goblin', 20, [14]), { iniciativa: true })
    expect(noMomento(solta, {})).toEqual(solta)
    expect(lerHistorico(JSON.parse(JSON.stringify([naRodada, inicio, solta])))).toEqual([naRodada, inicio, solta])
    expect(lerHistorico([{ ...solta, rodada: 'dois', iniciativa: 'sim' }])).toEqual([solta])
  })

  it('descarta só a rolagem corrompida', () => {
    const boa = rolar(pedido(), dadoFixo(10))
    expect(lerHistorico([boa, { natural: 3 }, { ...boa, tipo: 'soma', faces: 7, bonus: 0 }])).toEqual([boa])
    expect(lerHistorico('lixo')).toBeNull()
  })

  it('pedido antigo ganha os campos novos com o padrão', () => {
    expect(lerPedido({ teste: 'Atletismo', cd: 12, modificador: 2, modo: 'vantagem' })).toEqual({
      ...PEDIDO_PADRAO,
      rotulo: 'Atletismo',
      cd: 12,
      modificador: 2,
      modo: 'vantagem',
    })
  })

  it('campo inválido no pedido volta ao padrão', () => {
    expect(lerPedido({ dado: 7, cd: 99, quantidade: 0, modo: 'turbo' })).toEqual(PEDIDO_PADRAO)
    expect(lerPedido(null)).toBeNull()
  })
})
