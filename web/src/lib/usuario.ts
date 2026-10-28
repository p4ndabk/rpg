import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools'

// Identidade de quem joga, no formato Nostr (a mesma chave do Voz). Nesta fase só frontend, ninguém assina nada:
// o app guarda só o nome e a chave PÚBLICA. A nsec (chave secreta) aparece uma vez, para a pessoa guardar, e nunca é salva.

export const TAMANHO_MAXIMO_NOME = 40

export interface Usuario {
  /** Chave pública em hexadecimal: é o "id" da pessoa nas salas e nas peças. */
  pubkey: string
  nome: string
}

export type Entrada =
  | { ok: true; pubkey: string; tipo: 'nsec' | 'npub' }
  | { ok: false; motivo: 'vazia' | 'invalida' }

/** Cria uma identidade nova. A nsec é mostrada uma vez e descartada. */
export function gerarIdentidade(): { nsec: string; pubkey: string } {
  const chave = generateSecretKey()
  return { nsec: nip19.nsecEncode(chave), pubkey: getPublicKey(chave) }
}

/** Aceita a nsec (a chave de sempre) ou só a npub (para quem não quer colar a secreta). Guarda só a pública. */
export function lerEntrada(texto: string): Entrada {
  const limpo = texto.trim().replace(/^nostr:/, '')
  if (limpo === '') return { ok: false, motivo: 'vazia' }
  try {
    const d = nip19.decode(limpo)
    if (d.type === 'nsec') return { ok: true, pubkey: getPublicKey(d.data), tipo: 'nsec' }
    if (d.type === 'npub') return { ok: true, pubkey: d.data, tipo: 'npub' }
  } catch {
    // cai no inválido
  }
  return { ok: false, motivo: 'invalida' }
}

export const npubDe = (pubkey: string): string => nip19.npubEncode(pubkey)

/** "npub1abcd…wxyz": o bastante para reconhecer sem ocupar a tela. */
export function npubCurta(pubkey: string): string {
  const n = npubDe(pubkey)
  return `${n.slice(0, 9)}…${n.slice(-4)}`
}

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

export function lerUsuario(v: unknown): Usuario | null {
  if (!ehObjeto(v) || typeof v.pubkey !== 'string' || !/^[0-9a-f]{64}$/.test(v.pubkey)) return null
  const nome = typeof v.nome === 'string' ? v.nome.trim().slice(0, TAMANHO_MAXIMO_NOME) : ''
  return { pubkey: v.pubkey, nome: nome || 'Sem nome' }
}
