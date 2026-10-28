import { finalizeEvent, type Event, type EventTemplate } from 'nostr-tools'
import { SimplePool } from 'nostr-tools/pool'

// Cópia trancada (ver cofre.ts) da sala ou do progresso nos relays. Evento substituível (kind 30078, como a foto da
// sala): a cópia nova toma o lugar da velha. Quem achou o evento é pela etiqueta `p` com a pubkey da pessoa, então
// funciona em qualquer navegador, sem a nsec: só quem sabe a senha abre o conteúdo. Sem validade: dura o que o relay quiser.

export const KIND_BACKUP = 30078
export type TipoBackup = 'sala' | 'jornada'
export const ETIQUETA_BACKUP = 'rpg-backup'
/** Passou disto o relay costuma recusar; a sala comprimida e trancada fica muito abaixo. */
export const TAMANHO_MAXIMO_BACKUP = 100_000

export const idDoBackup = (tipo: TipoBackup, id: string): string => `rpg:backup:${tipo}:${id}`

export function montarBackup(tipo: TipoBackup, id: string, pubkey: string, conteudo: string, criadoEm: number): EventTemplate {
  return { kind: KIND_BACKUP, created_at: criadoEm, tags: [['d', idDoBackup(tipo, id)], ['p', pubkey], ['t', ETIQUETA_BACKUP]], content: conteudo }
}

export interface BackupLido {
  tipo: TipoBackup
  id: string
  em: number
  conteudo: string
}

export function lerBackup(e: Pick<Event, 'tags' | 'content' | 'created_at'>): BackupLido | null {
  const d = e.tags.find((t) => t[0] === 'd')?.[1] ?? ''
  const m = /^rpg:backup:(sala|jornada):([0-9a-zA-Z-]{8,64})$/.exec(d)
  if (!m || !e.tags.some((t) => t[0] === 't' && t[1] === ETIQUETA_BACKUP)) return null
  return { tipo: m[1] as TipoBackup, id: m[2]!, em: e.created_at, conteudo: e.content }
}

/** De vários eventos da mesma cópia (um por relay, ou de navegadores diferentes), fica o mais novo de cada uma. */
export function maisNovos(eventos: Pick<Event, 'tags' | 'content' | 'created_at'>[], tipo: TipoBackup): BackupLido[] {
  const por = new Map<string, BackupLido>()
  for (const e of eventos) {
    const b = lerBackup(e)
    if (!b || b.tipo !== tipo) continue
    const atual = por.get(b.id)
    if (!atual || b.em > atual.em) por.set(b.id, b)
  }
  return [...por.values()].sort((a, b) => b.em - a.em)
}

export interface ResultadoSalvar {
  /** Em quantos relays a cópia entrou. */
  ok: number
  total: number
}

/** Assina com a chave do navegador e manda a todos os relays; espera a resposta de cada um (até `limiteMs`). */
export async function salvarNosRelays(relays: string[], modelo: EventTemplate, chave: Uint8Array, limiteMs = 10_000): Promise<ResultadoSalvar> {
  const pool = new SimplePool()
  try {
    const evento = finalizeEvent(modelo, chave)
    const tempo = new Promise<never>((_, rejeitar) => setTimeout(() => rejeitar(new Error('tempo')), limiteMs))
    const respostas = await Promise.all(pool.publish(relays, evento).map((p) => Promise.race([p, tempo]).then(() => true, () => false)))
    return { ok: respostas.filter(Boolean).length, total: relays.length }
  } finally {
    pool.close(relays)
    pool.destroy()
  }
}

/** Busca nos relays as cópias trancadas que apontam para `pubkey`. */
export async function buscarNosRelays(relays: string[], pubkey: string, tipo: TipoBackup, limiteMs = 8000): Promise<BackupLido[]> {
  const pool = new SimplePool()
  try {
    const eventos = await pool.querySync(relays, { kinds: [KIND_BACKUP], '#p': [pubkey], '#t': [ETIQUETA_BACKUP] }, { maxWait: limiteMs })
    return maisNovos(eventos, tipo)
  } finally {
    pool.close(relays)
    pool.destroy()
  }
}
