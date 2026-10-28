import type { EventTemplate, Event } from 'nostr-tools'
import { lerFoto, lerMensagemCliente, type Foto, type MensagemCliente } from '../rede/protocolo'
import type { CasaDeCenario } from '../sala'

// Os dois tipos de evento da sala em relays Nostr. Tudo aqui é puro (monta e lê), sem rede.
//  - FOTO (kind 30078, substituível): o mestre publica a foto pública da sala; o relay guarda só a última.
//  - PEDIDO (kind 21078, efêmero): quem joga pede ao mestre "entrar" ou uma ação; o relay só repassa.

export const KIND_FOTO = 30078
export const KIND_PEDIDO = 21078

/** Os relays costumam recusar evento grande; o log da foto é cortado para caber. */
export const TAMANHO_MAXIMO_FOTO = 48_000
const VALIDADE_FOTO_S = 3 * 24 * 60 * 60
const VALIDADE_PEDIDO_S = 60

/** Um trecho do cenário: o terreno, a linha e as colunas de `de` a `ate`. Mapa grande cabe no limite dos relays. */
export type Trecho = [terreno: string, linha: number, de: number, ate: number]

/** Junta casas vizinhas da mesma linha e do mesmo terreno em trechos. */
export function comprimirCenario(cenario: CasaDeCenario[]): Trecho[] {
  const ordenado = [...cenario].sort((a, b) => a.linha - b.linha || a.coluna - b.coluna)
  const trechos: Trecho[] = []
  for (const c of ordenado) {
    const ultimo = trechos[trechos.length - 1]
    if (ultimo && ultimo[0] === c.terreno && ultimo[1] === c.linha && ultimo[3] === c.coluna - 1) ultimo[3] = c.coluna
    else trechos.push([c.terreno, c.linha, c.coluna, c.coluna])
  }
  return trechos
}

/** O contrário; trecho malformado é ignorado (a validação do terreno fica com `lerSala`). */
export function expandirCenario(v: unknown): CasaDeCenario[] {
  if (!Array.isArray(v)) return []
  const casas: CasaDeCenario[] = []
  for (const t of v) {
    if (!Array.isArray(t) || typeof t[0] !== 'string' || !Number.isInteger(t[1]) || !Number.isInteger(t[2]) || !Number.isInteger(t[3])) continue
    if (t[3] < t[2] || t[3] - t[2] > 200) continue
    for (let c = t[2]; c <= t[3]; c++) casas.push({ coluna: c, linha: t[1], terreno: t[0] as CasaDeCenario['terreno'] })
  }
  return casas
}

/** A foto como vai no evento: o cenário vira trechos. */
function paraOEvento(foto: Foto): unknown {
  const { cenario, ...sala } = foto.sala
  return { ...foto, sala: cenario?.length ? { ...sala, cenarioTrechos: comprimirCenario(cenario) } : sala }
}

export const tagDaSala = (salaId: string): string => `rpg:${salaId}`

export interface Quem {
  pubkey: string
  nome: string
}

/** Uma jogada de `pubkey` que o mestre recusou; vai como etiqueta na foto seguinte, para a tela de quem jogou voltar ao real. */
export interface Recusa {
  pubkey: string
  acao: string
}

/** Lê a etiqueta de recusa de uma foto, se houver. */
export function lerRecusa(e: Pick<Event, 'tags'>): Recusa | null {
  const t = e.tags.find((x) => x[0] === 'recusou')
  return t && typeof t[1] === 'string' && /^[0-9a-f]{64}$/.test(t[1]) ? { pubkey: t[1], acao: (t[2] ?? '').slice(0, 20) } : null
}

export function montarFoto(salaId: string, versao: number, foto: Foto, criadoEm: number, recusou?: Recusa): EventTemplate {
  let log = foto.log
  let content = JSON.stringify({ v: 1, versao, foto: paraOEvento(foto) })
  // O log vem do mais novo para o mais antigo: corta o fim até caber.
  while (content.length > TAMANHO_MAXIMO_FOTO && log.length > 0) {
    log = log.slice(0, Math.floor(log.length / 2))
    content = JSON.stringify({ v: 1, versao, foto: paraOEvento({ ...foto, log }) })
  }
  return {
    kind: KIND_FOTO,
    created_at: criadoEm,
    tags: [['d', tagDaSala(salaId)], ['expiration', String(criadoEm + VALIDADE_FOTO_S)], ...(recusou ? [['recusou', recusou.pubkey, recusou.acao]] : [])],
    content,
  }
}

export function lerEventoFoto(e: Pick<Event, 'content'>): { versao: number; foto: Foto } | null {
  let v: unknown
  try {
    v = JSON.parse(e.content)
  } catch {
    return null
  }
  if (typeof v !== 'object' || v === null) return null
  const { versao, foto } = v as { versao?: unknown; foto?: unknown }
  if (!Number.isInteger(versao)) return null
  // O cenário vem em trechos; devolve às casas antes de validar a sala.
  const f = foto as { sala?: Record<string, unknown> } | undefined
  const trechos = f?.sala && 'cenarioTrechos' in f.sala ? expandirCenario(f.sala.cenarioTrechos) : null
  const lida = lerFoto(JSON.stringify(trechos && f?.sala ? { ...f, sala: { ...f.sala, cenario: trechos } } : foto))
  return lida ? { versao: versao as number, foto: lida } : null
}

export function montarPedido(salaId: string, quem: Quem, mensagem: MensagemCliente, criadoEm: number): EventTemplate {
  return {
    kind: KIND_PEDIDO,
    created_at: criadoEm,
    tags: [['d', tagDaSala(salaId)], ['expiration', String(criadoEm + VALIDADE_PEDIDO_S)]],
    content: JSON.stringify({ v: 1, quem, msg: mensagem }),
  }
}

/** Só pedidos de quem joga: entrar, agir ou dar sinal de presença. O resto (abrir, estado, listar) é do mestre e nunca vem de fora. */
export function lerPedido(e: Pick<Event, 'content'>): { quem: Quem; mensagem: Extract<MensagemCliente, { t: 'entrar' | 'acao' | 'presenca' }> } | null {
  let v: unknown
  try {
    v = JSON.parse(e.content)
  } catch {
    return null
  }
  if (typeof v !== 'object' || v === null) return null
  const { quem, msg } = v as { quem?: { pubkey?: unknown; nome?: unknown }; msg?: unknown }
  if (!quem || typeof quem.pubkey !== 'string' || !/^[0-9a-f]{64}$/.test(quem.pubkey)) return null
  const mensagem = lerMensagemCliente(JSON.stringify(msg))
  if (!mensagem || (mensagem.t !== 'entrar' && mensagem.t !== 'acao' && mensagem.t !== 'presenca')) return null
  return { quem: { pubkey: quem.pubkey, nome: typeof quem.nome === 'string' ? quem.nome.slice(0, 40) : 'Sem nome' }, mensagem }
}
