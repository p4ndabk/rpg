import type { EventTemplate, Event } from 'nostr-tools'
import { lerMensagemCliente, type Foto, type MensagemCliente } from '../rede/protocolo'
import { lerFoto } from '../rede/protocolo'

// Os dois tipos de evento da sala em relays Nostr. Tudo aqui é puro (monta e lê), sem rede.
//  - FOTO (kind 30078, substituível): o mestre publica a foto pública da sala; o relay guarda só a última.
//  - PEDIDO (kind 21078, efêmero): quem joga pede ao mestre "entrar" ou uma ação; o relay só repassa.

export const KIND_FOTO = 30078
export const KIND_PEDIDO = 21078

/** Os relays costumam recusar evento grande; o log da foto é cortado para caber. */
export const TAMANHO_MAXIMO_FOTO = 48_000
const VALIDADE_FOTO_S = 3 * 24 * 60 * 60
const VALIDADE_PEDIDO_S = 60

export const tagDaSala = (salaId: string): string => `rpg:${salaId}`

export interface Quem {
  pubkey: string
  nome: string
}

export function montarFoto(salaId: string, versao: number, foto: Foto, criadoEm: number): EventTemplate {
  let log = foto.log
  let content = JSON.stringify({ v: 1, versao, foto })
  // O log vem do mais novo para o mais antigo: corta o fim até caber.
  while (content.length > TAMANHO_MAXIMO_FOTO && log.length > 0) {
    log = log.slice(0, Math.floor(log.length / 2))
    content = JSON.stringify({ v: 1, versao, foto: { ...foto, log } })
  }
  return {
    kind: KIND_FOTO,
    created_at: criadoEm,
    tags: [['d', tagDaSala(salaId)], ['expiration', String(criadoEm + VALIDADE_FOTO_S)]],
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
  const lida = lerFoto(JSON.stringify(foto))
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

/** Só pedidos de quem joga: entrar ou agir. O resto (abrir, estado, listar) é do mestre e nunca vem de fora. */
export function lerPedido(e: Pick<Event, 'content'>): { quem: Quem; mensagem: Extract<MensagemCliente, { t: 'entrar' | 'acao' }> } | null {
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
  if (!mensagem || (mensagem.t !== 'entrar' && mensagem.t !== 'acao')) return null
  return { quem: { pubkey: quem.pubkey, nome: typeof quem.nome === 'string' ? quem.nome.slice(0, 40) : 'Sem nome' }, mensagem }
}
