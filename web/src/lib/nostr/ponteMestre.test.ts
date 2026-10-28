import { finalizeEvent, generateSecretKey, getPublicKey, type Event, type EventTemplate, type Filter } from 'nostr-tools'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adicionarPeca, alternarOculta, criarSala } from '../sala'
import type { Estado, MensagemServidor } from '../rede/protocolo'
import type { Barramento } from './barramento'
import { KIND_FOTO, KIND_PEDIDO, lerEventoFoto, montarPedido, tagDaSala } from './eventos'
import { PonteMestre } from './ponteMestre'
import { chaveDaSala, desproteger, ehProtegida, proteger } from './protegida'

const SALA = 'sala-1234567'
const chave = () => generateSecretKey()
const MESTRE = getPublicKey(chave())
const ANA = getPublicKey(chave())

/** Um relay de mentira: guarda a última foto e repassa pedidos a quem está ouvindo. */
function relayDeMentira() {
  const ouvintes: { filtro: Filter; aoEvento: (e: Event) => void }[] = []
  const publicados: Event[] = []
  const casa = (f: Filter, e: Event) => (!f.kinds || f.kinds.includes(e.kind)) && (!f['#d'] || e.tags.some((t) => t[0] === 'd' && f['#d']!.includes(t[1]!)))
  const entregar = (e: Event) => {
    publicados.push(e)
    for (const o of ouvintes) if (casa(o.filtro, e)) o.aoEvento(e)
  }
  const barramentoDe = (sk: Uint8Array): Barramento => ({
    publicar: (m: EventTemplate) => {
      entregar(finalizeEvent(m, sk))
    },
    assinar: (filtro, aoEvento) => {
      const o = { filtro, aoEvento }
      ouvintes.push(o)
      return () => ouvintes.splice(ouvintes.indexOf(o), 1)
    },
    fechar: () => {},
  })
  return { barramentoDe, publicados, entregar }
}

const estadoInicial = (): Estado => {
  let sala = criarSala('Cripta', 8, 8, SALA, MESTRE)
  sala = adicionarPeca(sala, 'Goblin', 'monstro', 'g')
  sala = adicionarPeca(sala, 'Orc', 'monstro', 'o')
  return { sala: alternarOculta(sala, 'o'), log: [], jogadores: [] }
}

describe('PonteMestre', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  function montar() {
    const rel = relayDeMentira()
    const skMestre = chave()
    const skAna = chave()
    const recebidas: MensagemServidor[] = []
    let relogio = 1000
    const ponte = new PonteMestre(rel.barramentoDe(skMestre), (m) => recebidas.push(m), () => relogio++, 0)
    ponte.enviar({ t: 'abrir', sala: SALA, pubkey: MESTRE, nome: 'Mestra', estado: estadoInicial(), versao: 0 })
    vi.advanceTimersByTime(300)
    const pedir = (m: Parameters<typeof montarPedido>[2], sk = skAna, pubkey = ANA) =>
      rel.barramentoDe(sk).publicar(montarPedido(SALA, { pubkey, nome: 'Ana' }, m, 1000))
    const fotos = () => rel.publicados.filter((e) => e.kind === KIND_FOTO)
    return { ponte, rel, recebidas, pedir, fotos, skAna, skMestre }
  }

  it('abrir publica a foto pública da sala, sem a peça escondida', () => {
    const { fotos } = montar()
    expect(fotos()).toHaveLength(1)
    const foto = lerEventoFoto(fotos()[0]!)!
    expect(foto.foto.sala.pecas.map((p) => p.id)).toEqual(['g'])
    expect(fotos()[0]!.tags).toContainEqual(['d', tagDaSala(SALA)])
  })

  it('a resposta do mestre ao próprio abrir chega por aoMensagem', () => {
    const { recebidas } = montar()
    expect(recebidas[0]).toMatchObject({ t: 'ola', papel: 'mestre', versao: 1 })
  })

  it('quem joga entra por pedido: vira jogador na foto e o mestre recebe o estado novo', () => {
    const { pedir, fotos, recebidas } = montar()
    pedir({ t: 'entrar', sala: SALA, pubkey: ANA, nome: 'Ana' })
    vi.advanceTimersByTime(300)
    expect(lerEventoFoto(fotos().at(-1)!)!.foto.jogadores.map((j) => j.nome)).toEqual(['Ana'])
    expect(recebidas.filter((m) => m.t === 'estado').at(-1)).toMatchObject({ t: 'estado' })
  })

  it('uma ação sem "entrar" antes também registra a pessoa e vale (mestre que recarregou)', () => {
    const { pedir, fotos } = montar()
    pedir({ t: 'acao', acao: { tipo: 'colocar', nome: 'Ana' } })
    vi.advanceTimersByTime(300)
    const foto = lerEventoFoto(fotos().at(-1)!)!.foto
    expect(foto.jogadores.map((j) => j.pubkey)).toEqual([ANA])
    expect(foto.sala.pecas.find((p) => p.dono === ANA)?.nome).toBe('Ana')
  })

  it('ação inválida (mover peça alheia) não muda a sala, mas a foto seguinte avisa a recusa', () => {
    const { pedir, fotos } = montar()
    pedir({ t: 'entrar', sala: SALA, pubkey: ANA, nome: 'Ana' })
    vi.advanceTimersByTime(300)
    const antes = fotos().length
    const sala = lerEventoFoto(fotos().at(-1)!)!.foto.sala
    pedir({ t: 'acao', acao: { tipo: 'mover', peca: 'g', coluna: 3, linha: 3 } })
    vi.advanceTimersByTime(300)
    expect(fotos()).toHaveLength(antes + 1)
    const ultima = fotos().at(-1)!
    expect(ultima.tags).toContainEqual(['recusou', ANA, 'mover'])
    expect(lerEventoFoto(ultima)!.foto.sala).toEqual(sala)
    // A etiqueta vale uma vez só.
    vi.advanceTimersByTime(60_000)
    expect(fotos().at(-1)!.tags.some((t) => t[0] === 'recusou')).toBe(false)
  })

  it('ação que vale não leva etiqueta de recusa', () => {
    const { pedir, fotos } = montar()
    pedir({ t: 'entrar', sala: SALA, pubkey: ANA, nome: 'Ana' })
    vi.advanceTimersByTime(300)
    pedir({ t: 'acao', acao: { tipo: 'colocar', nome: 'Ana' } })
    vi.advanceTimersByTime(300)
    expect(lerEventoFoto(fotos().at(-1)!)!.foto.sala.pecas.some((p) => p.dono === ANA)).toBe(true)
    expect(fotos().some((f) => f.tags.some((t) => t[0] === 'recusou'))).toBe(false)
  })

  it('pedido que finge ser o mestre é ignorado', () => {
    const { pedir, fotos } = montar()
    const antes = fotos().length
    pedir({ t: 'entrar', sala: SALA, pubkey: MESTRE, nome: 'Falso' })
    pedir({ t: 'entrar', sala: SALA, pubkey: ANA, nome: 'Falso' }, undefined, MESTRE)
    vi.advanceTimersByTime(300)
    expect(fotos()).toHaveLength(antes)
  })

  it('só aceita entrar e agir: abrir, estado e listar vindos de fora são descartados', () => {
    const { rel, skAna, fotos, ponte } = montar()
    const antes = fotos().length
    const e = estadoInicial()
    for (const msg of [
      { t: 'abrir', sala: SALA, pubkey: ANA, nome: 'x', estado: e, versao: 9 },
      { t: 'estado', base: 1, estado: e },
      { t: 'listar', pubkey: ANA },
    ] as const) {
      rel.barramentoDe(skAna).publicar(montarPedido(SALA, { pubkey: ANA, nome: 'x' }, msg, 1000))
    }
    vi.advanceTimersByTime(300)
    expect(fotos()).toHaveLength(antes)
    ponte.fechar()
  })

  it('o pedido de presença marca a pessoa como vista na foto e avisa o mestre', () => {
    const { pedir, fotos, recebidas } = montar()
    pedir({ t: 'presenca' })
    vi.advanceTimersByTime(300)
    const foto = lerEventoFoto(fotos().at(-1)!)!.foto
    expect(Object.keys(foto.vistos ?? {})).toEqual([ANA])
    expect(foto.jogadores.map((j) => j.pubkey)).toEqual([ANA])
    expect(recebidas.filter((m) => m.t === 'presenca').at(-1)).toMatchObject({ t: 'presenca', vistos: { [ANA]: expect.any(Number) } })
  })

  it('republica a foto a cada minuto, como sinal do mestre', () => {
    const { fotos } = montar()
    const antes = fotos().length
    vi.advanceTimersByTime(60_000)
    expect(fotos()).toHaveLength(antes + 1)
    expect(fotos().at(-1)!.created_at).toBeGreaterThan(fotos()[antes - 1]!.created_at)
  })

  it('o mesmo evento repetido pelo relay só vale uma vez', () => {
    const { rel, skAna, fotos } = montar()
    const evento = finalizeEvent(montarPedido(SALA, { pubkey: ANA, nome: 'Ana' }, { t: 'entrar', sala: SALA, pubkey: ANA, nome: 'Ana' }, 1000), skAna)
    const antes = fotos().length
    rel.entregar(evento)
    rel.entregar(evento)
    vi.advanceTimersByTime(300)
    expect(evento.kind).toBe(KIND_PEDIDO)
    expect(fotos()).toHaveLength(antes + 1)
  })

  it('created_at da foto sempre cresce, mesmo no mesmo segundo', () => {
    const { fotos, pedir, ponte } = montar()
    pedir({ t: 'entrar', sala: SALA, pubkey: ANA, nome: 'Ana' })
    vi.advanceTimersByTime(300)
    ponte.reenviarFoto()
    const criados = fotos().map((f) => f.created_at)
    expect(criados).toEqual([...criados].sort((a, b) => a - b))
    expect(new Set(criados).size).toBe(criados.length)
  })
})

describe('PonteMestre com senha', () => {
  // Trancar usa fluxos reais do navegador (CompressionStream): aqui os timers são de verdade.
  async function montar() {
    const rel = relayDeMentira()
    const chaveSala = await chaveDaSala('abre-te', SALA, 1000)
    let relogio = 1000
    const ponte = new PonteMestre(rel.barramentoDe(chave()), () => {}, () => relogio++, 0, chaveSala)
    ponte.enviar({ t: 'abrir', sala: SALA, pubkey: MESTRE, nome: 'Mestra', estado: estadoInicial(), versao: 0 })
    const fotos = () => rel.publicados.filter((e) => e.kind === KIND_FOTO)
    await vi.waitFor(() => expect(fotos()).toHaveLength(1))
    const entrar = async (aberto: boolean) => {
      const modelo = montarPedido(SALA, { pubkey: ANA, nome: 'Ana' }, { t: 'entrar', sala: SALA, pubkey: ANA, nome: 'Ana' }, 1000)
      rel.barramentoDe(chave()).publicar(aberto ? modelo : await proteger(modelo, chaveSala))
    }
    const jogadores = async () => lerEventoFoto((await desproteger(fotos().at(-1)!, chaveSala))!)!.foto.jogadores.map((j) => j.nome)
    return { ponte, fotos, entrar, chaveSala, jogadores }
  }

  it('a foto sai trancada: marcada como protegida e ilegível sem a senha', async () => {
    const { ponte, fotos, chaveSala } = await montar()
    const foto = fotos()[0]!
    expect(ehProtegida(foto)).toBe(true)
    expect(foto.content).not.toContain('Cripta')
    expect(lerEventoFoto(foto)).toBeNull()
    expect(lerEventoFoto((await desproteger(foto, chaveSala))!)?.foto.sala.nome).toBe('Cripta')
    ponte.fechar()
  })

  it('só entra quem manda o pedido trancado com a senha', async () => {
    const { ponte, fotos, entrar, jogadores } = await montar()
    await entrar(true)
    await new Promise((r) => setTimeout(r, 150))
    expect(fotos()).toHaveLength(1)
    expect(await jogadores()).toEqual([])
    await entrar(false)
    await vi.waitFor(() => expect(fotos().length).toBeGreaterThan(1))
    expect(await jogadores()).toEqual(['Ana'])
    ponte.fechar()
  })
})
