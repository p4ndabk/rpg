import { describe, expect, it } from 'vitest'
import {
  adicionarPeca,
  alternarCondicao,
  casaBloqueada,
  casaLivrePerto,
  casasDaForma,
  pintar,
  terrenoEm,
  alternarOculta,
  definirBonusIniciativa,
  editarFicha,
  definirDono,
  definirPv,
  definirPvBase,
  pvDaPeca,
  editarSala,
  definirIniciativa,
  ehMestre,
  pecasVisiveis,
  podeMover,
  alterarPv,
  criarSala,
  daVez,
  encerrarCombate,
  iniciais,
  iniciarCombate,
  lerSala,
  moverPeca,
  motivoDoMovimento,
  nomeCasa,
  alternarDestaque,
  alternarOcultoCenario,
  cenarioVisivel,
  disfarcarCenario,
  ocultarCenario,
  destaqueEm,
  DESTAQUES_MAX,
  DESTAQUE_TEXTO_MAX,
  limparDestaques,
  passarVez,
  pecaEm,
  pvPadrao,
  primeiraCasaLivre,
  tamanhoMinimo,
  marcaDaVez,
  vezChegouParaMim,
  removerPeca,
  type Sala,
} from './sala'

const dadoFixo =
  (...valores: number[]) =>
  () =>
    valores.shift()!

const salaVazia = (colunas = 4, linhas = 4): Sala => criarSala('Cripta', colunas, linhas, 'sala')

let contador = 0
const comPeca = (sala: Sala, nome: string, tipo: 'personagem' | 'monstro' = 'monstro') =>
  adicionarPeca(sala, nome, tipo, `p${++contador}`)

describe('casas', () => {
  it('nomeia como tabuleiro', () => {
    expect(nomeCasa(0, 0)).toBe('A1')
    expect(nomeCasa(2, 3)).toBe('C4')
    expect(nomeCasa(25, 19)).toBe('Z20')
    expect(nomeCasa(26, 0)).toBe('AA1')
    expect(nomeCasa(27, 11)).toBe('AB12')
    expect(nomeCasa(49, 49)).toBe('AX50')
  })

  it('acha a primeira casa livre linha por linha', () => {
    let sala = comPeca(salaVazia(), 'Goblin')
    sala = comPeca(sala, 'Orc')
    expect(sala.pecas.map((p) => nomeCasa(p.coluna, p.linha))).toEqual(['A1', 'B1'])
    expect(primeiraCasaLivre(sala)).toEqual({ coluna: 2, linha: 0 })
  })
})

describe('adicionarPeca', () => {
  it('numera nomes repetidos', () => {
    let sala = salaVazia()
    for (let i = 0; i < 3; i++) sala = comPeca(sala, 'Goblin')
    expect(sala.pecas.map((p) => p.nome)).toEqual(['Goblin', 'Goblin 2', 'Goblin 3'])
  })

  it('ignora nome vazio', () => {
    expect(comPeca(salaVazia(), '   ').pecas).toHaveLength(0)
  })

  it('não passa do tamanho do grid', () => {
    let sala = salaVazia(4, 4)
    for (let i = 0; i < 20; i++) sala = comPeca(sala, 'Rato')
    expect(sala.pecas).toHaveLength(16)
    expect(primeiraCasaLivre(sala)).toBeNull()
  })
})

describe('moverPeca', () => {
  it('move para casa vazia', () => {
    const sala = comPeca(salaVazia(), 'Goblin')
    const id = sala.pecas[0]!.id
    expect(pecaEm(moverPeca(sala, id, 3, 2), 3, 2)?.id).toBe(id)
  })

  it('não move para casa ocupada nem para fora do grid', () => {
    let sala = comPeca(salaVazia(), 'Goblin')
    sala = comPeca(sala, 'Orc')
    const [goblin, orc] = sala.pecas
    expect(moverPeca(sala, goblin!.id, orc!.coluna, orc!.linha)).toBe(sala)
    expect(moverPeca(sala, goblin!.id, 4, 0)).toBe(sala)
    expect(moverPeca(sala, goblin!.id, -1, 0)).toBe(sala)
  })

  it('diz o motivo quando não pode mover', () => {
    let sala = comPeca(salaVazia(), 'Goblin')
    sala = comPeca(sala, 'Orc')
    const [goblin, orc] = sala.pecas
    sala = pintar(sala, [{ coluna: 3, linha: 3 }], 'parede')
    expect(motivoDoMovimento(sala, goblin!.id, orc!.coluna, orc!.linha)).toBe('ocupada')
    expect(motivoDoMovimento(sala, goblin!.id, 3, 3)).toBe('bloqueada')
    expect(motivoDoMovimento(sala, goblin!.id, -1, 0)).toBe('fora')
    expect(motivoDoMovimento(sala, goblin!.id, 2, 2)).toBeNull()
    // A própria casa da peça não é "ocupada".
    expect(motivoDoMovimento(sala, goblin!.id, goblin!.coluna, goblin!.linha)).toBeNull()
  })

  it('remove', () => {
    const sala = comPeca(salaVazia(), 'Goblin')
    expect(removerPeca(sala, sala.pecas[0]!.id).pecas).toEqual([])
  })
})

describe('casa escolhida', () => {
  it('coloca a peça na casa pedida se estiver livre', () => {
    const sala = adicionarPeca(salaVazia(), 'Goblin', 'monstro', 'g', { coluna: 2, linha: 3 })
    expect(nomeCasa(sala.pecas[0]!.coluna, sala.pecas[0]!.linha)).toBe('C4')
  })

  it('cai na primeira livre se a casa pedida estiver ocupada', () => {
    let sala = adicionarPeca(salaVazia(), 'Goblin', 'monstro', 'g', { coluna: 0, linha: 0 })
    sala = adicionarPeca(sala, 'Orc', 'monstro', 'o', { coluna: 0, linha: 0 })
    expect(nomeCasa(sala.pecas[1]!.coluna, sala.pecas[1]!.linha)).toBe('B1')
  })
})

describe('combate', () => {
  const tresPecas = () => {
    let sala = comPeca(salaVazia(), 'Goblin')
    sala = comPeca(sala, 'Mago', 'personagem')
    return comPeca(sala, 'Orc')
  }
  const nomes = (sala: Sala) => sala.combate!.ordem.map((o) => sala.pecas.find((p) => p.id === o.id)!.nome)

  it('ordena pela iniciativa; no empate, personagem antes de monstro', () => {
    const { sala, iniciativas } = iniciarCombate(tresPecas(), dadoFixo(10, 10, 15))
    expect(iniciativas.map((i) => i.valor)).toEqual([10, 10, 15])
    expect(nomes(sala)).toEqual(['Orc', 'Mago', 'Goblin'])
    expect(daVez(sala)?.nome).toBe('Orc')
    expect(sala.combate).toMatchObject({ vez: 0, rodada: 1 })
  })

  it('passa a vez e vira a rodada no fim da ordem', () => {
    let { sala } = iniciarCombate(tresPecas(), dadoFixo(3, 2, 1))
    sala = passarVez(passarVez(sala))
    expect(daVez(sala)?.nome).toBe('Orc')
    sala = passarVez(sala)
    expect(sala.combate).toMatchObject({ vez: 0, rodada: 2 })
    expect(daVez(sala)?.nome).toBe('Goblin')
  })

  it('remover quem está antes da vez mantém a vez com a mesma peça', () => {
    let { sala } = iniciarCombate(tresPecas(), dadoFixo(3, 2, 1))
    sala = passarVez(sala)
    const goblin = sala.pecas.find((p) => p.nome === 'Goblin')!
    sala = removerPeca(sala, goblin.id)
    expect(daVez(sala)?.nome).toBe('Mago')
  })

  it('remover quem está na vez passa para o próximo; sem ninguém, encerra', () => {
    let { sala } = iniciarCombate(tresPecas(), dadoFixo(3, 2, 1))
    sala = removerPeca(sala, daVez(sala)!.id)
    expect(daVez(sala)?.nome).toBe('Mago')
    for (const p of [...sala.pecas]) sala = removerPeca(sala, p.id)
    expect(sala.combate).toBeNull()
  })

  it('encerra', () => {
    expect(encerrarCombate(iniciarCombate(tresPecas(), dadoFixo(1, 2, 3)).sala).combate).toBeNull()
  })

  it('lê de volta um combate salvo e descarta peças que sumiram', () => {
    const { sala } = iniciarCombate(tresPecas(), dadoFixo(3, 2, 1))
    expect(lerSala(JSON.parse(JSON.stringify(sala)))).toEqual(sala)
    const semGoblin = { ...sala, pecas: sala.pecas.slice(1) }
    expect(lerSala(semGoblin)?.combate?.ordem).toHaveLength(2)
  })
})

describe('pontos de vida', () => {
  it('a peça nova começa com a vida cheia do atalho ou do tipo', () => {
    const sala = comPeca(comPeca(comPeca(salaVazia(), 'Dragão'), 'Goblin 2'), 'Shadowheart', 'personagem')
    expect(sala.pecas.map((p) => [p.pv, p.pvMax])).toEqual([[60, 60], [7, 7], [20, 20]])
    expect(pvPadrao('Mímico', 'monstro')).toBe(10)
  })

  it('aceita a vida máxima escolhida, dentro dos limites', () => {
    expect(adicionarPeca(salaVazia(), 'Orc', 'monstro', 'a', undefined, 35).pecas[0]).toMatchObject({ pv: 35, pvMax: 35 })
    expect(adicionarPeca(salaVazia(), 'Orc', 'monstro', 'a', undefined, 5000).pecas[0]).toMatchObject({ pvMax: 999 })
  })

  it('dano e cura param em 0 e no máximo', () => {
    const sala = comPeca(salaVazia(), 'Goblin')
    const id = sala.pecas[0]!.id
    expect(alterarPv(sala, id, -3).pecas[0]!.pv).toBe(4)
    expect(alterarPv(sala, id, -50).pecas[0]!.pv).toBe(0)
    expect(alterarPv(alterarPv(sala, id, -3), id, 50).pecas[0]!.pv).toBe(7)
  })

  it('sala salva sem pontos de vida ganha o padrão; valores fora da faixa são corrigidos', () => {
    const antiga = { id: 'a', nome: 'Lobo', tipo: 'monstro', coluna: 0, linha: 0 }
    expect(lerSala({ ...salaVazia(), pecas: [antiga] })?.pecas[0]).toMatchObject({ pv: 11, pvMax: 11 })
    expect(lerSala({ ...salaVazia(), pecas: [{ ...antiga, pv: 99, pvMax: 12 }] })?.pecas[0]).toMatchObject({ pv: 12, pvMax: 12 })
  })
})

const MESTRE = 'a'.repeat(64)
const JOGADOR = 'b'.repeat(64)

describe('papéis na sala', () => {
  it('só quem criou a sala é o mestre', () => {
    const sala = criarSala('Cripta', 6, 6, 's', MESTRE)
    expect(ehMestre(sala, MESTRE)).toBe(true)
    expect(ehMestre(sala, JOGADOR)).toBe(false)
    expect(ehMestre(sala, undefined)).toBe(false)
    expect(ehMestre(salaVazia(), MESTRE)).toBe(false)
  })

  it('peça escondida só aparece para o mestre', () => {
    const sala = alternarOculta(comPeca(comPeca(salaVazia(), 'Goblin'), 'Orc'), comPeca(salaVazia(), 'x').pecas[0]!.id)
    expect(pecasVisiveis(sala, false)).toHaveLength(2)
    const oculta = alternarOculta(sala, sala.pecas[0]!.id)
    expect(pecasVisiveis(oculta, false).map((p) => p.nome)).toEqual(['Orc'])
    expect(pecasVisiveis(oculta, true)).toHaveLength(2)
    expect(alternarOculta(oculta, oculta.pecas[0]!.id).pecas[0]!.oculta).toBe(false)
  })

  it('quem joga move só as peças que são suas', () => {
    const sala = adicionarPeca(salaVazia(), 'Mago', 'personagem', 'm', undefined, undefined, JOGADOR)
    const peca = sala.pecas[0]!
    expect(podeMover(peca, false, JOGADOR)).toBe(true)
    expect(podeMover(peca, false, 'c'.repeat(64))).toBe(false)
    expect(podeMover(peca, false, undefined)).toBe(false)
    expect(podeMover(peca, true, MESTRE)).toBe(true)
  })

  it('lê de volta mestre, dono, peça oculta e condições; descarta chave ou condição inválida', () => {
    let sala = adicionarPeca(criarSala('Cripta', 6, 6, 's', MESTRE), 'Mago', 'personagem', 'm', undefined, undefined, JOGADOR)
    sala = alternarCondicao(alternarOculta(sala, 'm'), 'm', 'Caído')
    expect(lerSala(JSON.parse(JSON.stringify(sala)))).toEqual(sala)
    const ruim = { ...sala, mestre: 'oi', pecas: [{ ...sala.pecas[0]!, dono: 'oi', condicoes: ['Voando', 'Caído'] }] }
    const lida = lerSala(ruim)!
    expect(lida.mestre).toBeUndefined()
    expect(lida.pecas[0]!.dono).toBeUndefined()
    expect(lida.pecas[0]!.condicoes).toEqual(['Caído'])
  })

  it('alterna condição e remove o campo quando não sobra nenhuma', () => {
    const sala = comPeca(salaVazia(), 'Goblin')
    const id = sala.pecas[0]!.id
    const com = alternarCondicao(sala, id, 'Envenenado')
    expect(com.pecas[0]!.condicoes).toEqual(['Envenenado'])
    expect('condicoes' in alternarCondicao(com, id, 'Envenenado').pecas[0]!).toBe(false)
  })
})

describe('cenário', () => {
  it('pinta, troca e apaga terreno', () => {
    let sala = pintar(salaVazia(), [{ coluna: 1, linha: 1 }, { coluna: 2, linha: 1 }], 'parede')
    expect(terrenoEm(sala, 1, 1)).toBe('parede')
    sala = pintar(sala, [{ coluna: 2, linha: 1 }], 'agua')
    expect(terrenoEm(sala, 2, 1)).toBe('agua')
    expect(sala.cenario).toHaveLength(2)
    sala = pintar(sala, [{ coluna: 1, linha: 1 }, { coluna: 2, linha: 1 }], null)
    expect(sala.cenario).toBeUndefined()
  })

  it('ignora casa fora do grid', () => {
    expect(pintar(salaVazia(4, 4), [{ coluna: 9, linha: 9 }], 'parede').cenario).toBeUndefined()
  })

  it('parede, árvore e pedra barram; água e porta não', () => {
    let sala = pintar(salaVazia(), [{ coluna: 1, linha: 0 }], 'parede')
    sala = pintar(sala, [{ coluna: 2, linha: 0 }], 'agua')
    sala = comPeca(sala, 'Goblin')
    const id = sala.pecas[0]!.id
    expect(casaBloqueada(sala, 1, 0)).toBe(true)
    expect(casaBloqueada(sala, 2, 0)).toBe(false)
    expect(moverPeca(sala, id, 1, 0)).toBe(sala)
    expect(moverPeca(sala, id, 2, 0).pecas[0]).toMatchObject({ coluna: 2, linha: 0 })
  })

  it('peça nova não entra em casa bloqueada', () => {
    const sala = pintar(salaVazia(), [{ coluna: 0, linha: 0 }], 'pedra')
    expect(primeiraCasaLivre(sala)).toEqual({ coluna: 1, linha: 0 })
    expect(adicionarPeca(sala, 'Orc', 'monstro', 'o', { coluna: 0, linha: 0 }).pecas[0]).toMatchObject({ coluna: 1, linha: 0 })
  })

  it('terreno que barra não cobre peça, mas o que não barra cobre', () => {
    const sala = comPeca(salaVazia(), 'Goblin') // A1
    expect(pintar(sala, [{ coluna: 0, linha: 0 }], 'parede').cenario).toBeUndefined()
    expect(terrenoEm(pintar(sala, [{ coluna: 0, linha: 0 }], 'agua'), 0, 0)).toBe('agua')
  })

  it('desenha formas: linha reta, retângulo cheio e contorno', () => {
    const a = { coluna: 1, linha: 1 }
    expect(casasDaForma('pincel', a, { coluna: 3, linha: 3 })).toEqual([{ coluna: 3, linha: 3 }])
    expect(casasDaForma('linha', a, { coluna: 4, linha: 1 })).toHaveLength(4)
    expect(casasDaForma('linha', a, { coluna: 4, linha: 4 }).map((c) => `${c.coluna},${c.linha}`)).toEqual(['1,1', '2,2', '3,3', '4,4'])
    expect(casasDaForma('linha', { coluna: 4, linha: 4 }, a)).toHaveLength(4)
    expect(casasDaForma('retangulo', a, { coluna: 3, linha: 3 })).toHaveLength(9)
    expect(casasDaForma('contorno', a, { coluna: 3, linha: 3 })).toHaveLength(8)
    expect(casasDaForma('retangulo', { coluna: 3, linha: 3 }, a)).toHaveLength(9)
  })

  it('editar a sala apara o cenário que ficou fora do grid', () => {
    let sala = pintar(salaVazia(10, 10), [{ coluna: 9, linha: 9 }, { coluna: 2, linha: 2 }], 'parede')
    sala = editarSala(sala, 'x', 6, 6)
    expect(sala.cenario).toEqual([{ coluna: 2, linha: 2, terreno: 'parede' }])
  })

  it('lê de volta e descarta casa inválida, repetida ou fora do grid', () => {
    const sala = pintar(salaVazia(), [{ coluna: 1, linha: 1 }], 'lava')
    expect(lerSala(JSON.parse(JSON.stringify(sala)))).toEqual(sala)
    const ruim = { ...sala, cenario: [{ coluna: 1, linha: 1, terreno: 'lava' }, { coluna: 1, linha: 1, terreno: 'parede' }, { coluna: 9, linha: 9, terreno: 'lava' }, { coluna: 0, linha: 0, terreno: 'ouro' }] }
    expect(lerSala(ruim)!.cenario).toEqual([{ coluna: 1, linha: 1, terreno: 'lava' }])
  })
})

describe('vezChegouParaMim', () => {
  const base = adicionarPeca(comPeca(salaVazia(), 'Goblin'), 'Mago', 'personagem', 'm', undefined, undefined, JOGADOR)
  const goblin = base.pecas.find((p) => p.nome === 'Goblin')!
  const naVez = (id: string, rodada = 1): Sala => ({
    ...base,
    combate: { ordem: [{ id: 'm', iniciativa: 15 }, { id: goblin.id, iniciativa: 10 }], vez: id === 'm' ? 0 : 1, rodada },
  })

  it('avisa quando a vez muda para a peça de quem joga', () => {
    expect(vezChegouParaMim(marcaDaVez(naVez(goblin.id)), naVez('m'), JOGADOR)).toBe(true)
    expect(vezChegouParaMim(undefined, naVez('m'), JOGADOR)).toBe(true)
  })

  it('avisa de novo na rodada seguinte, mesmo sem ver a vez de quem agiu no meio', () => {
    expect(vezChegouParaMim(marcaDaVez(naVez('m', 1)), naVez('m', 2), JOGADOR)).toBe(true)
  })

  it('não avisa se a vez já era dela, se é de outra pessoa ou se ninguém está na vez', () => {
    expect(vezChegouParaMim(marcaDaVez(naVez('m')), naVez('m'), JOGADOR)).toBe(false)
    expect(vezChegouParaMim(marcaDaVez(naVez('m')), naVez(goblin.id), JOGADOR)).toBe(false)
    expect(vezChegouParaMim(marcaDaVez(naVez(goblin.id)), naVez('m'), 'c'.repeat(64))).toBe(false)
    expect(vezChegouParaMim(marcaDaVez(naVez(goblin.id)), base, JOGADOR)).toBe(false)
    expect(vezChegouParaMim(marcaDaVez(naVez(goblin.id)), naVez('m'), undefined)).toBe(false)
  })
})

describe('ficha do personagem', () => {
  const sala = adicionarPeca(salaVazia(), 'Guerreira', 'personagem', 'g', undefined, undefined, JOGADOR)

  it('guarda descrição, CD e bônus de iniciativa', () => {
    const e = editarFicha(sala, 'g', { descricao: '  Cicatriz no queixo e olhar cansado.  ', cd: 14, bonusIniciativa: 2 })
    expect(e.pecas[0]).toMatchObject({ descricao: 'Cicatriz no queixo e olhar cansado.', cd: 14, bonusIniciativa: 2 })
  })

  it('a classe escolhida vale só se for conhecida, e vazia volta ao emblema pelo nome', () => {
    const base = { descricao: '', cd: null, bonusIniciativa: 0 }
    const mago = editarFicha(sala, 'g', { ...base, classe: 'Mago' })
    expect(mago.pecas[0]?.classe).toBe('Mago')
    expect(editarFicha(mago, 'g', { ...base, classe: 'Bardo' }).pecas[0]?.classe).toBeUndefined()
    expect(editarFicha(mago, 'g', { ...base, classe: '' }).pecas[0]?.classe).toBeUndefined()
    // Sem o campo (ficha de antes), a classe fica como está.
    expect(editarFicha(mago, 'g', base).pecas[0]?.classe).toBe('Mago')
  })

  it('monstro não tem classe', () => {
    const m = adicionarPeca(salaVazia(), 'Goblin', 'monstro', 'm')
    expect(editarFicha(m, 'm', { descricao: '', cd: null, bonusIniciativa: 0, classe: 'Mago' }).pecas[0]?.classe).toBeUndefined()
  })

  it('a classe volta do armazenamento', () => {
    const mago = editarFicha(sala, 'g', { descricao: '', cd: null, bonusIniciativa: 0, classe: 'Ladina' })
    expect(lerSala(JSON.parse(JSON.stringify(mago)))?.pecas[0]?.classe).toBe('Ladina')
    const lixo = JSON.parse(JSON.stringify(mago))
    lixo.pecas[0].classe = 'Bardo'
    expect(lerSala(lixo)?.pecas[0]?.classe).toBeUndefined()
  })

  it('campo vazio, CD nula ou bônus zero somem da ficha', () => {
    const cheia = editarFicha(sala, 'g', { descricao: 'x', cd: 10, bonusIniciativa: 3 })
    const vazia = editarFicha(cheia, 'g', { descricao: '   ', cd: null, bonusIniciativa: 0 })
    expect('descricao' in vazia.pecas[0]!).toBe(false)
    expect('cd' in vazia.pecas[0]!).toBe(false)
    expect('bonusIniciativa' in vazia.pecas[0]!).toBe(false)
  })

  it('respeita os limites: CD de 1 a 30, bônus de -10 a +20, descrição de até 600 letras', () => {
    const e = editarFicha(sala, 'g', { descricao: 'a'.repeat(900), cd: 99, bonusIniciativa: -50 })
    expect(e.pecas[0]!.descricao).toHaveLength(600)
    expect(e.pecas[0]).toMatchObject({ cd: 30, bonusIniciativa: -10 })
    expect(editarFicha(sala, 'g', { descricao: '', cd: 0, bonusIniciativa: 0 }).pecas[0]!.cd).toBe(1)
  })

  it('lê de volta e descarta valor inválido', () => {
    const e = editarFicha(sala, 'g', { descricao: 'Oi', cd: 12, bonusIniciativa: 0 })
    expect(lerSala(JSON.parse(JSON.stringify(e)))!.pecas[0]).toMatchObject({ descricao: 'Oi', cd: 12 })
    expect(lerSala({ ...e, pecas: e.pecas.map((p) => ({ ...p, cd: 99, descricao: 5 })) })!.pecas[0]).not.toHaveProperty('cd')
  })
})

describe('bônus de iniciativa', () => {
  it('soma ao D20 e entra na ordem, com o dado e o bônus à vista', () => {
    let sala = comPeca(comPeca(salaVazia(), 'Goblin'), 'Mago', 'personagem')
    sala = definirBonusIniciativa(sala, sala.pecas[1]!.id, 5)
    const { sala: c, iniciativas } = iniciarCombate(sala, dadoFixo(12, 10))
    expect(iniciativas.map((i) => [i.peca.nome, i.dado, i.bonus, i.valor])).toEqual([['Goblin', 12, 0, 12], ['Mago', 10, 5, 15]])
    expect(c.combate!.ordem.map((o) => o.iniciativa)).toEqual([15, 12]) // o Mago passou o Goblin
  })

  it('fica entre -10 e +20 e zero tira o campo', () => {
    const sala = comPeca(salaVazia(), 'Goblin')
    const id = sala.pecas[0]!.id
    expect(definirBonusIniciativa(sala, id, 99).pecas[0]!.bonusIniciativa).toBe(20)
    expect(definirBonusIniciativa(sala, id, -99).pecas[0]!.bonusIniciativa).toBe(-10)
    expect('bonusIniciativa' in definirBonusIniciativa(definirBonusIniciativa(sala, id, 3), id, 0).pecas[0]!).toBe(false)
  })

  it('lê de volta e descarta valor inválido', () => {
    const sala = definirBonusIniciativa(comPeca(salaVazia(), 'Goblin'), 'x', 0)
    const com = { ...sala, pecas: sala.pecas.map((p) => ({ ...p, bonusIniciativa: 4 })) }
    expect(lerSala(JSON.parse(JSON.stringify(com)))!.pecas[0]!.bonusIniciativa).toBe(4)
    expect(lerSala({ ...com, pecas: com.pecas.map((p) => ({ ...p, bonusIniciativa: 99 })) })!.pecas[0]!.bonusIniciativa).toBeUndefined()
  })
})

describe('casaLivrePerto', () => {
  it('acha a casa livre mais próxima, pulando peças e paredes', () => {
    let sala = salaVazia(8, 8)
    sala = adicionarPeca(sala, 'Goblin', 'monstro', 'g', { coluna: 3, linha: 3 })
    expect(casaLivrePerto(sala, { coluna: 3, linha: 3 })).toEqual({ coluna: 2, linha: 2 })
    sala = pintar(sala, [{ coluna: 2, linha: 2 }, { coluna: 3, linha: 2 }], 'parede')
    const perto = casaLivrePerto(sala, { coluna: 3, linha: 3 })!
    expect(Math.max(Math.abs(perto.coluna - 3), Math.abs(perto.linha - 3))).toBe(1)
    expect(casaBloqueada(sala, perto.coluna, perto.linha)).toBe(false)
  })

  it('devolve null com o grid cheio', () => {
    let sala = salaVazia(4, 4)
    for (let l = 0; l < 4; l++) for (let c = 0; c < 4; c++) sala = adicionarPeca(sala, 'P', 'monstro', `p${c}${l}`, { coluna: c, linha: l })
    expect(casaLivrePerto(sala, { coluna: 0, linha: 0 })).toBeNull()
  })
})

describe('vida base', () => {
  it('peça nova nasce com a vida base do nome, do tipo ou de fábrica', () => {
    let sala = definirPvBase(salaVazia(), { Goblin: 20, '#monstro': 33, '#personagem': 40 })
    expect(pvDaPeca(sala, 'Goblin', 'monstro')).toBe(20)
    expect(pvDaPeca(sala, 'Goblin 3', 'monstro')).toBe(20) // numerado vale como o nome
    expect(pvDaPeca(sala, 'Mímico', 'monstro')).toBe(33) // fora dos atalhos: o tipo
    expect(pvDaPeca(sala, 'Shadowheart', 'personagem')).toBe(40)
    expect(pvDaPeca(sala, 'Orc', 'monstro')).toBe(15) // atalho sem base própria: fábrica, não o tipo
    sala = adicionarPeca(sala, 'Goblin', 'monstro', 'g')
    expect(sala.pecas[0]).toMatchObject({ pv: 20, pvMax: 20 })
    expect(pvDaPeca(salaVazia(), 'Goblin', 'monstro')).toBe(7)
  })

  it('null volta ao valor de fábrica e a lista vazia some do salvo', () => {
    const sala = definirPvBase(salaVazia(), { Goblin: 20 })
    expect(definirPvBase(sala, { Goblin: null }).pvBase).toBeUndefined()
    expect(definirPvBase(sala, { Goblin: 5000 }).pvBase).toEqual({ Goblin: 999 })
  })

  it('com nasPecas, as peças do tabuleiro com esse nome ganham o novo máximo e a vida cheia', () => {
    let sala = comPeca(comPeca(comPeca(salaVazia(), 'Goblin'), 'Goblin'), 'Orc') // Goblin, Goblin 2, Orc
    sala = alterarPv(sala, sala.pecas[0]!.id, -3)
    const so = definirPvBase(sala, { Goblin: 30 })
    expect(so.pecas.map((p) => p.pvMax)).toEqual([7, 7, 15]) // só para as próximas
    const todas = definirPvBase(sala, { Goblin: 30 }, true)
    expect(todas.pecas.map((p) => [p.pv, p.pvMax])).toEqual([[30, 30], [30, 30], [15, 15]])
  })

  it('o tipo vale para as peças fora dos atalhos', () => {
    let sala = comPeca(comPeca(salaVazia(), 'Mímico'), 'Goblin')
    sala = definirPvBase(sala, { '#monstro': 25 }, true)
    expect(sala.pecas.map((p) => p.pvMax)).toEqual([25, 7])
  })

  it('lê de volta e descarta valor inválido', () => {
    const sala = definirPvBase(salaVazia(), { Goblin: 20 })
    expect(lerSala(JSON.parse(JSON.stringify(sala)))!.pvBase).toEqual({ Goblin: 20 })
    expect(lerSala({ ...sala, pvBase: { Goblin: 'muito', Orc: 0, Lobo: 12 } })!.pvBase).toEqual({ Lobo: 12 })
  })
})

describe('definirPv', () => {
  const sala = comPeca(salaVazia(), 'Goblin') // 7 PV
  const id = sala.pecas[0]!.id

  it('muda o máximo e deixa a vida cheia, ou aceita o atual', () => {
    expect(definirPv(sala, id, 30).pecas[0]).toMatchObject({ pv: 30, pvMax: 30 })
    expect(definirPv(sala, id, 30, 12).pecas[0]).toMatchObject({ pv: 12, pvMax: 30 })
  })

  it('respeita os limites: o atual nunca passa do máximo, e o máximo fica entre 1 e 999', () => {
    expect(definirPv(sala, id, 10, 99).pecas[0]).toMatchObject({ pv: 10, pvMax: 10 })
    expect(definirPv(sala, id, 10, -5).pecas[0]).toMatchObject({ pv: 0 })
    expect(definirPv(sala, id, 0).pecas[0]).toMatchObject({ pvMax: 1 })
    expect(definirPv(sala, id, 5000).pecas[0]).toMatchObject({ pvMax: 999 })
  })
})

describe('cenário escondido', () => {
  const base = () => pintar(pintar(salaVazia(8, 8), [{ coluna: 1, linha: 1 }, { coluna: 2, linha: 1 }], 'buraco'), [{ coluna: 3, linha: 3 }], 'parede')

  it('pinta já escondido', () => {
    const s = pintar(salaVazia(8, 8), [{ coluna: 0, linha: 0 }], 'armadilha', true)
    expect(s.cenario).toEqual([{ coluna: 0, linha: 0, terreno: 'armadilha', oculta: true }])
    expect(cenarioVisivel(s.cenario!)).toEqual([])
  })

  it('esconde e revela uma casa, sem mexer nas outras', () => {
    const a = alternarOcultoCenario(base(), { coluna: 1, linha: 1 })
    expect(a.cenario!.find((c) => c.coluna === 1 && c.linha === 1)?.oculta).toBe(true)
    expect(a.cenario!.find((c) => c.coluna === 2 && c.linha === 1)?.oculta).toBeUndefined()
    const b = alternarOcultoCenario(a, { coluna: 1, linha: 1 })
    expect(b.cenario!.every((c) => !c.oculta)).toBe(true)
    expect(alternarOcultoCenario(base(), { coluna: 7, linha: 7 })).toEqual(base())
  })

  it('esconde tudo, só um tipo, e revela tudo', () => {
    const tudo = ocultarCenario(base(), true)
    expect(tudo.cenario!.every((c) => c.oculta)).toBe(true)
    const buracos = ocultarCenario(base(), true, (c) => c.terreno === 'buraco')
    expect(buracos.cenario!.filter((c) => c.oculta).map((c) => c.terreno)).toEqual(['buraco', 'buraco'])
    expect(ocultarCenario(tudo, false).cenario!.some((c) => c.oculta)).toBe(false)
  })

  it('sem mudança devolve a mesma sala', () => {
    const s = base()
    expect(ocultarCenario(s, false)).toBe(s)
    expect(ocultarCenario(salaVazia(), true)).toEqual(salaVazia())
  })

  it('pintar por cima de uma casa escondida troca o terreno e mostra de novo', () => {
    const s = pintar(alternarOcultoCenario(base(), { coluna: 1, linha: 1 }), [{ coluna: 1, linha: 1 }], 'agua')
    expect(s.cenario!.find((c) => c.coluna === 1 && c.linha === 1)).toEqual({ coluna: 1, linha: 1, terreno: 'agua' })
  })

  it('disfarça: quem joga vê o disfarce, o mestre segue vendo o terreno real', () => {
    const s = disfarcarCenario(pintar(salaVazia(8, 8), [{ coluna: 2, linha: 2 }], 'porta'), { coluna: 2, linha: 2 }, 'parede')
    expect(s.cenario).toEqual([{ coluna: 2, linha: 2, terreno: 'porta', oculta: true, disfarce: 'parede' }])
    expect(cenarioVisivel(s.cenario!)).toEqual([{ coluna: 2, linha: 2, terreno: 'parede' }])
    // A porta de verdade não barra, mesmo parecendo parede.
    expect(casaBloqueada(s, 2, 2)).toBe(false)
  })

  it('tirar o disfarce esconde de vez; revelar tira o disfarce', () => {
    const d = disfarcarCenario(pintar(salaVazia(8, 8), [{ coluna: 2, linha: 2 }], 'porta'), { coluna: 2, linha: 2 }, 'parede')
    const sem = disfarcarCenario(d, { coluna: 2, linha: 2 }, null)
    expect(sem.cenario).toEqual([{ coluna: 2, linha: 2, terreno: 'porta', oculta: true }])
    expect(cenarioVisivel(sem.cenario!)).toEqual([])
    expect(ocultarCenario(d, false).cenario).toEqual([{ coluna: 2, linha: 2, terreno: 'porta' }])
    // Esconder tudo de novo não perde o disfarce.
    expect(ocultarCenario(d, true)).toBe(d)
  })

  it('disfarce em casa sem terreno, repetido ou sem efeito não muda nada', () => {
    const s = pintar(salaVazia(8, 8), [{ coluna: 2, linha: 2 }], 'porta')
    expect(disfarcarCenario(s, { coluna: 5, linha: 5 }, 'parede')).toBe(s)
    expect(disfarcarCenario(s, { coluna: 2, linha: 2 }, null)).toBe(s)
    const d = disfarcarCenario(s, { coluna: 2, linha: 2 }, 'parede')
    expect(disfarcarCenario(d, { coluna: 2, linha: 2 }, 'parede')).toBe(d)
  })

  it('o disfarce volta do armazenamento, mas só em casa escondida', () => {
    const d = disfarcarCenario(pintar(salaVazia(8, 8), [{ coluna: 2, linha: 2 }], 'porta'), { coluna: 2, linha: 2 }, 'parede')
    expect(lerSala(JSON.parse(JSON.stringify(d)))?.cenario).toEqual(d.cenario)
    const solto = JSON.parse(JSON.stringify(d))
    delete solto.cenario[0].oculta
    expect(lerSala(solto)?.cenario).toEqual([{ coluna: 2, linha: 2, terreno: 'porta' }])
  })

  it('volta do armazenamento com a marca', () => {
    const s = ocultarCenario(base(), true, (c) => c.terreno === 'parede')
    expect(lerSala(JSON.parse(JSON.stringify(s)))?.cenario?.filter((c) => c.oculta).map((c) => c.terreno)).toEqual(['parede'])
  })
})

describe('destaques', () => {
  const sala = () => salaVazia(8, 8)

  it('liga e desliga o destaque de uma casa, com texto curto', () => {
    const a = alternarDestaque(sala(), { coluna: 2, linha: 3 }, '  O baú está trancado  ')
    expect(a.destaques).toEqual([{ coluna: 2, linha: 3, texto: 'O baú está trancado' }])
    expect(destaqueEm(a, 2, 3)?.texto).toBe('O baú está trancado')
    const b = alternarDestaque(a, { coluna: 2, linha: 3 })
    expect(b.destaques).toBeUndefined()
  })

  it('texto vazio não vira texto, e o texto é cortado', () => {
    expect(alternarDestaque(sala(), { coluna: 0, linha: 0 }, '   ').destaques).toEqual([{ coluna: 0, linha: 0 }])
    expect(alternarDestaque(sala(), { coluna: 0, linha: 0 }, 'x'.repeat(100)).destaques![0]!.texto).toHaveLength(DESTAQUE_TEXTO_MAX)
  })

  it('fora do grid não destaca; passou do máximo, o mais antigo sai', () => {
    expect(alternarDestaque(sala(), { coluna: 9, linha: 0 })).toEqual(sala())
    let s = sala()
    for (let i = 0; i < DESTAQUES_MAX + 2; i++) s = alternarDestaque(s, { coluna: i % 8, linha: Math.floor(i / 8) })
    expect(s.destaques).toHaveLength(DESTAQUES_MAX)
    expect(destaqueEm(s, 0, 0)).toBeUndefined()
    expect(destaqueEm(s, 1, 1)).toBeDefined()
  })

  it('limpar tira todos; encolher o grid tira os que ficaram fora; lerSala descarta lixo', () => {
    let s = alternarDestaque(alternarDestaque(sala(), { coluna: 1, linha: 1 }), { coluna: 7, linha: 7 })
    expect(limparDestaques(s).destaques).toBeUndefined()
    s = editarSala(s, 'x', 4, 4)
    expect(s.destaques).toEqual([{ coluna: 1, linha: 1 }])
    const lida = lerSala({ ...s, destaques: [{ coluna: 1, linha: 1, texto: 'ok' }, { coluna: 1, linha: 1 }, { coluna: 99, linha: 0 }, 'x', null] })
    expect(lida?.destaques).toEqual([{ coluna: 1, linha: 1, texto: 'ok' }])
  })
})

describe('editarSala', () => {
  it('muda o nome e o tamanho, e nome vazio mantém o antigo', () => {
    const sala = salaVazia(6, 6)
    expect(editarSala(sala, ' Torre ', 10, 9)).toMatchObject({ nome: 'Torre', colunas: 10, linhas: 9 })
    expect(editarSala(sala, '   ', 6, 6).nome).toBe('Cripta')
  })

  it('respeita os limites do grid', () => {
    const sala = salaVazia(6, 6)
    expect(editarSala(sala, 'x', 99, 99)).toMatchObject({ colunas: 50, linhas: 50 })
    expect(editarSala(sala, 'x', 1, 1)).toMatchObject({ colunas: 4, linhas: 4 })
  })

  it('não encolhe para deixar peça fora do grid', () => {
    const sala = moverPeca(comPeca(salaVazia(10, 10), 'Goblin'), 'a', 0, 0)
    const com = adicionarPeca(salaVazia(10, 10), 'Orc', 'monstro', 'o', { coluna: 7, linha: 5 })
    expect(tamanhoMinimo(com)).toEqual({ colunas: 8, linhas: 6 })
    expect(editarSala(com, 'x', 4, 4)).toMatchObject({ colunas: 8, linhas: 6 })
    expect(editarSala(com, 'x', 4, 4).pecas).toEqual(com.pecas)
    expect(tamanhoMinimo(sala)).toEqual({ colunas: 4, linhas: 4 })
  })
})

describe('definirDono', () => {
  it('dá e tira o dono da peça', () => {
    const sala = comPeca(salaVazia(), 'Mago', 'personagem')
    const id = sala.pecas[0]!.id
    const com = definirDono(sala, id, JOGADOR)
    expect(com.pecas[0]!.dono).toBe(JOGADOR)
    expect('dono' in definirDono(com, id, undefined).pecas[0]!).toBe(false)
  })
})

describe('definirIniciativa', () => {
  it('reordena sem tirar a vez de quem está jogando', () => {
    const tres = ['Goblin', 'Mago', 'Orc'].reduce((acc, n) => comPeca(acc, n), salaVazia())
    const { sala } = iniciarCombate(tres, dadoFixo(15, 10, 5))
    const [a, b, c] = sala.pecas
    const passou = passarVez(sala)
    expect(daVez(passou)?.id).toBe(b!.id)
    const mudou = definirIniciativa(passou, c!.id, 20)
    expect(mudou.combate!.ordem.map((o) => o.id)).toEqual([c!.id, a!.id, b!.id])
    expect(daVez(mudou)?.id).toBe(b!.id)
    expect(definirIniciativa(salaVazia(), a!.id, 3)).toEqual(salaVazia())
  })
})

describe('iniciais', () => {
  it('usa duas letras', () => {
    expect(iniciais('Goblin Arqueiro')).toBe('GA')
    expect(iniciais('Goblin 2')).toBe('G2')
    expect(iniciais('lich')).toBe('LI')
    expect(iniciais('')).toBe('?')
  })
})

describe('lerSala', () => {
  it('lê de volta uma sala salva', () => {
    const sala = comPeca(comPeca(salaVazia(), 'Goblin'), 'Shadowheart', 'personagem')
    expect(lerSala(JSON.parse(JSON.stringify(sala)))).toEqual(sala)
  })

  it('descarta peça inválida, fora do grid ou em casa já ocupada', () => {
    const boa = { id: 'a', nome: 'Goblin', tipo: 'monstro', coluna: 0, linha: 0, pv: 7, pvMax: 7 }
    const sala = lerSala({
      ...salaVazia(),
      pecas: [boa, { ...boa, id: 'b' }, { ...boa, id: 'c', coluna: 9 }, { ...boa, id: 'd', tipo: 'dragão', coluna: 1 }],
    })
    expect(sala?.pecas).toEqual([boa])
  })

  it('recusa sala corrompida', () => {
    expect(lerSala(null)).toBeNull()
    expect(lerSala({ ...salaVazia(), colunas: 51 })).toBeNull()
    expect(lerSala({ ...salaVazia(), linhas: 51 })).toBeNull()
    expect(lerSala({ ...salaVazia(), colunas: 40 })).not.toBeNull()
  })
})
