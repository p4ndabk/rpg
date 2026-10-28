import { generateSecretKey, getPublicKey } from 'nostr-tools'
import { describe, expect, it } from 'vitest'
import { adicionarPeca, alternarOculta, criarSala, definirPvBase } from '../sala'
import { lerMesas, Servidor, type Mesas, type Saida } from './mesas'
import type { Estado, MensagemServidor } from './protocolo'

const chave = () => getPublicKey(generateSecretKey())
const MESTRE = chave()
const ANA = chave()
const SALA = 'sala-1234567'

const estadoInicial = (): Estado => {
  let sala = criarSala('Cripta', 8, 8, SALA, MESTRE)
  sala = adicionarPeca(sala, 'Goblin', 'monstro', 'g')
  sala = adicionarPeca(sala, 'Orc', 'monstro', 'o')
  return { sala: alternarOculta(sala, 'o'), log: [], jogadores: [] }
}

const para = (saidas: Saida[], id: string): MensagemServidor[] => saidas.filter((s) => s.para === id).map((s) => s.msg)

function montar() {
  const mesas: Mesas = {}
  const gravacoes: number[] = []
  const servidor = new Servidor(mesas, () => gravacoes.push(Object.keys(mesas).length))
  for (const id of ['m', 'a', 'b']) servidor.conectar(id)
  const abrir = (estado = estadoInicial(), versao = 0, pubkey = MESTRE, id = 'm') => servidor.tratar(id, { t: 'abrir', sala: SALA, pubkey, nome: 'Mestra', estado, versao })
  const entrar = (id: string, pubkey = ANA, nome = 'Ana') => servidor.tratar(id, { t: 'entrar', sala: SALA, pubkey, nome })
  return { mesas, gravacoes, servidor, abrir, entrar }
}

describe('Servidor: abrir e entrar', () => {
  it('o mestre cria a sala e recebe o estado completo na versão 1', () => {
    const { abrir, mesas, gravacoes } = montar()
    const saidas = abrir()
    expect(para(saidas, 'm')[0]).toMatchObject({ t: 'ola', papel: 'mestre', versao: 1 })
    expect(mesas[SALA]!.mestre).toBe(MESTRE)
    expect(gravacoes.length).toBe(1)
  })

  it('outra pessoa não toma a sala de quem já é o mestre', () => {
    const { abrir } = montar()
    abrir()
    expect(para(abrir(estadoInicial(), 0, ANA, 'a'), 'a')[0]).toEqual({ t: 'recusado', motivo: 'sala-de-outro-mestre' })
  })

  it('quem joga entra, recebe a foto sem peça escondida e o mestre é avisado', () => {
    const { abrir, entrar } = montar()
    abrir()
    const saidas = entrar('a')
    const ola = para(saidas, 'a')[0] as Extract<MensagemServidor, { t: 'ola' }>
    expect(ola).toMatchObject({ t: 'ola', papel: 'jogador' })
    expect('foto' in ola && ola.foto.sala.pecas.map((p) => p.id)).toEqual(['g'])
    const aoMestre = para(saidas, 'm')[0] as Extract<MensagemServidor, { t: 'estado' }>
    expect(aoMestre.estado.jogadores).toEqual([{ pubkey: ANA, nome: 'Ana' }])
    expect(aoMestre.estado.sala.pecas).toHaveLength(2) // o mestre vê a peça escondida
  })

  it('sala que não existe é recusada', () => {
    const { entrar } = montar()
    expect(para(entrar('a'), 'a')[0]).toEqual({ t: 'recusado', motivo: 'sala-nao-existe' })
  })

  it('o mestre que abre o próprio link entra como mestre', () => {
    const { abrir, entrar } = montar()
    abrir()
    expect(para(entrar('b', MESTRE), 'b')[0]).toMatchObject({ t: 'ola', papel: 'mestre' })
  })
})

describe('Servidor: estado do mestre', () => {
  it('troca o estado, sobe a versão e manda a foto a quem joga', () => {
    const { abrir, entrar, servidor } = montar()
    abrir()
    entrar('a')
    const estado = estadoInicial()
    estado.sala = { ...estado.sala, nome: 'Torre' }
    const saidas = servidor.tratar('m', { t: 'estado', base: 2, estado })
    expect(para(saidas, 'm')[0]).toMatchObject({ t: 'ok', versao: 3 })
    expect(para(saidas, 'a')[0]).toMatchObject({ t: 'foto', versao: 3 })
  })

  it('base velha vira conflito e o estado do servidor vence', () => {
    const { abrir, entrar, servidor } = montar()
    abrir()
    entrar('a')
    const saidas = servidor.tratar('m', { t: 'estado', base: 1, estado: estadoInicial() })
    expect(para(saidas, 'm')[0]).toMatchObject({ t: 'conflito', versao: 2 })
  })

  it('quem joga não troca o estado e não vira mestre pelo estado', () => {
    const { abrir, entrar, servidor } = montar()
    abrir()
    entrar('a')
    expect(para(servidor.tratar('a', { t: 'estado', base: 2, estado: estadoInicial() }), 'a')[0]).toEqual({ t: 'recusado', motivo: 'sem-permissao' })
  })

  it('o mestre que volta depois de jogadores agirem recebe o estado do servidor', () => {
    const { abrir, entrar, servidor, mesas } = montar()
    abrir()
    entrar('a') // versão 2
    servidor.tratar('a', { t: 'acao', acao: { tipo: 'colocar', nome: 'Mago' } }) // versão 3
    servidor.desconectar('m')
    servidor.conectar('m2')
    const saidas = servidor.tratar('m2', { t: 'abrir', sala: SALA, pubkey: MESTRE, nome: 'M', estado: estadoInicial(), versao: 1 })
    const ola = para(saidas, 'm2')[0] as Extract<MensagemServidor, { t: 'ola' }>
    expect(ola.versao).toBe(3)
    expect('estado' in ola && ola.estado.sala.pecas.some((p) => p.nome === 'Mago')).toBe(true)
    expect(mesas[SALA]!.versao).toBe(3)
  })
})

describe('Servidor: ações de quem joga', () => {
  it('colocar e mover aplicam no servidor e todos recebem', () => {
    const { abrir, entrar, servidor } = montar()
    abrir()
    entrar('a')
    const colocou = servidor.tratar('a', { t: 'acao', acao: { tipo: 'colocar', nome: 'Mago', casa: { coluna: 4, linha: 4 } } })
    const estado = (para(colocou, 'm')[0] as Extract<MensagemServidor, { t: 'estado' }>).estado
    const mago = estado.sala.pecas.find((p) => p.nome === 'Mago')!
    expect(mago.dono).toBe(ANA)
    expect(para(colocou, 'a')[0]).toMatchObject({ t: 'foto' })
    const moveu = servidor.tratar('a', { t: 'acao', acao: { tipo: 'mover', peca: mago.id, coluna: 5, linha: 5 } })
    expect((para(moveu, 'm')[0] as Extract<MensagemServidor, { t: 'estado' }>).estado.sala.pecas.find((p) => p.id === mago.id)).toMatchObject({ coluna: 5, linha: 5 })
  })

  it('ação inválida é ignorada e quem mandou volta a ver o estado real', () => {
    const { abrir, entrar, servidor, mesas } = montar()
    abrir()
    entrar('a')
    const versao = mesas[SALA]!.versao
    const saidas = servidor.tratar('a', { t: 'acao', acao: { tipo: 'mover', peca: 'g', coluna: 7, linha: 7 } })
    expect(para(saidas, 'a')[0]).toMatchObject({ t: 'foto', versao })
    expect(para(saidas, 'm')).toHaveLength(0)
    expect(mesas[SALA]!.versao).toBe(versao)
  })

  it('o mestre não manda ação de jogador', () => {
    const { abrir, servidor } = montar()
    abrir()
    expect(para(servidor.tratar('m', { t: 'acao', acao: { tipo: 'passar' } }), 'm')[0]).toEqual({ t: 'recusado', motivo: 'sem-permissao' })
  })
})

describe('Servidor: vida base', () => {
  it('o personagem que alguém chama nasce com a vida base do mestre', () => {
    const { servidor, abrir, entrar } = montar()
    const estado = estadoInicial()
    estado.sala = definirPvBase(estado.sala, { '#personagem': 44 })
    abrir(estado)
    entrar('a')
    const saidas = servidor.tratar('a', { t: 'acao', acao: { tipo: 'colocar', nome: 'Shadowheart' } })
    const e = (saidas.find((s) => s.para === 'm')!.msg as Extract<MensagemServidor, { t: 'estado' }>).estado
    expect(e.sala.pecas.at(-1)).toMatchObject({ nome: 'Shadowheart', pv: 44, pvMax: 44 })
  })
})

describe('Servidor: minhas salas', () => {
  const OUTRA = 'outra-sala-9999'
  const montarDuas = () => {
    let agora = 1000
    const mesas: Mesas = {}
    const servidor = new Servidor(mesas, () => {}, () => agora)
    for (const id of ['m', 'a', 'c']) servidor.conectar(id)
    servidor.tratar('m', { t: 'abrir', sala: SALA, pubkey: MESTRE, nome: 'Mestra', estado: estadoInicial(), versao: 0 })
    agora = 2000
    const outra = { ...estadoInicial(), sala: { ...estadoInicial().sala, id: OUTRA, nome: 'Taverna' } }
    servidor.tratar('c', { t: 'abrir', sala: OUTRA, pubkey: ANA, nome: 'Ana', estado: outra, versao: 0 })
    agora = 3000
    servidor.tratar('a', { t: 'entrar', sala: SALA, pubkey: ANA, nome: 'Ana' })
    return { servidor, mesas }
  }

  it('lista as salas em que a pessoa é mestre ou jogadora, da mais recente para a mais antiga', () => {
    const { servidor } = montarDuas()
    const lista = servidor.listar(ANA)
    expect(lista.map((s) => [s.id, s.papel])).toEqual([[SALA, 'jogador'], [OUTRA, 'mestre']])
    expect(lista[0]).toMatchObject({ nome: 'Cripta', jogadores: 1, rodada: null, atualizadaEm: 3000 })
  })

  it('quem não está em nenhuma sala recebe lista vazia, e o mestre vê todas as peças', () => {
    const { servidor } = montarDuas()
    expect(servidor.listar(chave())).toEqual([])
    expect(servidor.listar(MESTRE)[0]).toMatchObject({ id: SALA, papel: 'mestre', pecas: 2 })
    expect(servidor.listar(ANA)[0]!.pecas).toBe(1) // a peça escondida não conta para quem joga
  })

  it('responde ao pedido de lista pela mensagem', () => {
    const { servidor } = montarDuas()
    servidor.conectar('x')
    const saidas = servidor.tratar('x', { t: 'listar', pubkey: MESTRE })
    expect(saidas[0]!.msg).toMatchObject({ t: 'salas', salas: [{ id: SALA }] })
  })

  it('guarda a última atividade e lê de volta do arquivo', () => {
    const { mesas } = montarDuas()
    expect(mesas[SALA]!.atualizadaEm).toBe(3000)
    expect(lerMesas(JSON.parse(JSON.stringify(mesas)))[SALA]!.atualizadaEm).toBe(3000)
  })
})

describe('lerMesas', () => {
  it('lê o arquivo de volta e descarta sala corrompida ou com id trocado', () => {
    const { abrir, mesas } = montar()
    abrir()
    expect(lerMesas(JSON.parse(JSON.stringify(mesas)))).toEqual(mesas)
    expect(lerMesas({ outra: mesas[SALA] })).toEqual({})
    expect(lerMesas({ [SALA]: { mestre: 'x', versao: 1, estado: mesas[SALA]!.estado } })).toEqual({})
    expect(lerMesas(null)).toEqual({})
  })
})
