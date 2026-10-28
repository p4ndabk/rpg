import { describe, expect, it } from 'vitest'
import { visaoPublica } from '../rede/protocolo'
import { adicionarPeca, criarSala } from '../sala'
import { ehLocal, lerConexaoSala, lerConviteNostr, montarConvite, normalizarBase } from './convite'
import { lerEventoFoto, lerPedido, montarFoto, montarPedido, TAMANHO_MAXIMO_FOTO } from './eventos'
import { guardarRelays, lerListaDeRelays, normalizarRelay, RELAYS_PADRAO, relaysDoMestre } from './relays'
import type { Rolagem } from '../dados'

const MESTRE = 'a'.repeat(64)
const ANA = 'b'.repeat(64)
const SALA = 'sala-1234567'
const foto = () => visaoPublica({ sala: adicionarPeca(criarSala('Cripta', 6, 6, SALA, MESTRE), 'Goblin', 'monstro', 'g'), log: [], jogadores: [] })

describe('eventos', () => {
  it('foto: monta e lê de volta', () => {
    const e = montarFoto(SALA, 7, foto(), 1000)
    expect(e.kind).toBe(30078)
    expect(e.tags).toContainEqual(['d', 'rpg:sala-1234567'])
    expect(lerEventoFoto(e as never)).toMatchObject({ versao: 7, foto: { sala: { id: SALA } } })
  })

  it('foto: lixo e foto de sala inválida são descartados', () => {
    expect(lerEventoFoto({ content: 'oi' })).toBeNull()
    expect(lerEventoFoto({ content: '{"versao":1,"foto":{}}' })).toBeNull()
    expect(lerEventoFoto({ content: '{"versao":"x","foto":{}}' })).toBeNull()
  })

  it('foto: o log é cortado para caber no limite dos relays', () => {
    const log = Array.from({ length: 2000 }, (_, i) => ({ id: `r${i}`, rotulo: 'x'.repeat(40), dado: 20, resultados: [10], total: 10, quando: i }) as unknown as Rolagem)
    const e = montarFoto(SALA, 1, { ...foto(), log }, 1000)
    expect(e.content.length).toBeLessThanOrEqual(TAMANHO_MAXIMO_FOTO)
  })

  it('pedido: aceita entrar e acao, recusa o que é do mestre', () => {
    const quem = { pubkey: ANA, nome: 'Ana' }
    const entrar = montarPedido(SALA, quem, { t: 'entrar', sala: SALA, pubkey: ANA, nome: 'Ana' }, 1000)
    expect(lerPedido(entrar as never)?.mensagem.t).toBe('entrar')
    const agir = montarPedido(SALA, quem, { t: 'acao', acao: { tipo: 'passar' } }, 1000)
    expect(lerPedido(agir as never)?.mensagem.t).toBe('acao')
    const listar = montarPedido(SALA, quem, { t: 'listar', pubkey: ANA }, 1000)
    expect(lerPedido(listar as never)).toBeNull()
    expect(lerPedido({ content: JSON.stringify({ v: 1, quem: { pubkey: 'x', nome: 'a' }, msg: { t: 'acao', acao: { tipo: 'passar' } } }) })).toBeNull()
  })

  it('pedido expira em um minuto', () => {
    const e = montarPedido(SALA, { pubkey: ANA, nome: 'Ana' }, { t: 'acao', acao: { tipo: 'passar' } }, 1000)
    expect(e.tags).toContainEqual(['expiration', '1060'])
  })
})

describe('convite e relays', () => {
  it('convite: monta e lê de volta, com os relays', () => {
    const link = montarConvite('https://x.github.io/rpg/', { salaId: SALA, mestre: MESTRE, relays: ['wss://a.com', 'wss://b.com'] })
    expect(lerConviteNostr(link)).toEqual({ salaId: SALA, mestre: MESTRE, relays: ['wss://a.com', 'wss://b.com'] })
  })

  it('convite: com os relays padrão o link não leva a lista', () => {
    const link = montarConvite('https://x.github.io/rpg/', { salaId: SALA, mestre: MESTRE, relays: [...RELAYS_PADRAO] })
    expect(link).toBe(`https://x.github.io/rpg/#/entrar/${SALA}/nostr/${MESTRE}`)
    expect(lerConviteNostr(link)).toEqual({ salaId: SALA, mestre: MESTRE, relays: [] })
  })

  it('convite: o do servidor (só a sala) não é de relays', () => {
    expect(lerConviteNostr(`#/entrar/${SALA}`)).toBeNull()
    expect(lerConviteNostr(`#/entrar/${SALA}/nostr/curta`)).toBeNull()
  })

  it('convite: relay inválido é descartado', () => {
    expect(lerConviteNostr(`#/entrar/${SALA}/nostr/${MESTRE}?r=http%3A%2F%2Fx,wss%3A%2F%2Fok.com`)?.relays).toEqual(['wss://ok.com'])
  })

  it('conexão salva: lê as duas formas e descarta lixo', () => {
    expect(lerConexaoSala({ salaId: SALA })).toEqual({ salaId: SALA })
    expect(lerConexaoSala({ salaId: SALA, nostr: { mestre: MESTRE, relays: ['wss://a.com', 'lixo'] } })).toEqual({ salaId: SALA, nostr: { mestre: MESTRE, relays: ['wss://a.com'] } })
    expect(lerConexaoSala({ salaId: 'x' })).toBeNull()
    expect(lerConexaoSala(null)).toBeNull()
  })

  it('base do convite: só http(s) e avisa quando é local', () => {
    expect(normalizarBase(' https://p4ndabk.github.io/rpg/#/sala ')).toBe('https://p4ndabk.github.io/rpg/')
    expect(normalizarBase('ftp://x')).toBeNull()
    expect(ehLocal('http://localhost:5173/')).toBe(true)
    expect(ehLocal('http://127.0.0.1:4173/')).toBe(true)
    expect(ehLocal('http://192.168.68.106:5173/')).toBe(false)
    expect(ehLocal('https://p4ndabk.github.io/rpg/')).toBe(false)
  })

  it('relays: normaliza, tira repetidos e limita', () => {
    expect(normalizarRelay(' wss://a.com/ ')).toBe('wss://a.com')
    expect(normalizarRelay('https://a.com')).toBeNull()
    expect(lerListaDeRelays('wss://a.com, wss://a.com/ wss://b.com\nlixo')).toEqual(['wss://a.com', 'wss://b.com'])
    expect(lerListaDeRelays(Array.from({ length: 20 }, (_, i) => `wss://r${i}.com`).join(' '))).toHaveLength(6)
  })

  it('relays: sem armazenamento, vale o padrão', () => {
    expect(relaysDoMestre()).toEqual([...RELAYS_PADRAO])
    expect(guardarRelays('')).toEqual([...RELAYS_PADRAO])
  })
})
