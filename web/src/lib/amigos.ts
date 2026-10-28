import { nip19 } from 'nostr-tools'

// Lista de amigos: quem você já jogou ou vai jogar junto. Fica só neste navegador (`rpg:amigos`), com a chave
// pública e o nome que você deu. Serve para reconhecer a pessoa nas salas e para o mestre dar uma peça a ela.

export const CHAVE_AMIGOS = 'rpg:amigos'
export const MAXIMO_AMIGOS = 200
const TAMANHO_MAXIMO_NOME = 40
const HEX_64 = /^[0-9a-f]{64}$/i

export interface Amigo {
  pubkey: string
  nome: string
  /** Quando entrou na lista (ms desde 1970). */
  desde: number
}

export type ResultadoChave = { ok: true; pubkey: string } | { ok: false; motivo: 'vazia' | 'segredo' | 'invalida' | 'propria' }

/** Valida a chave de um amigo: aceita npub, nprofile, hex e `nostr:…`; recusa nsec (secreta) e a sua própria. */
export function lerChaveDoAmigo(texto: string, minhaPubkey: string | null): ResultadoChave {
  const limpo = texto.trim().replace(/^nostr:/i, '')
  if (limpo === '') return { ok: false, motivo: 'vazia' }
  if (limpo.toLowerCase().startsWith('nsec1')) return { ok: false, motivo: 'segredo' }
  let pubkey: string
  if (HEX_64.test(limpo)) pubkey = limpo.toLowerCase()
  else {
    try {
      const d = nip19.decode(limpo)
      if (d.type === 'npub') pubkey = d.data
      else if (d.type === 'nprofile') pubkey = d.data.pubkey
      else return { ok: false, motivo: 'invalida' }
    } catch {
      return { ok: false, motivo: 'invalida' }
    }
  }
  return pubkey === minhaPubkey ? { ok: false, motivo: 'propria' } : { ok: true, pubkey }
}

export function lerAmigos(v: unknown): Amigo[] | null {
  if (!Array.isArray(v)) return null
  const vistos = new Set<string>()
  const lista: Amigo[] = []
  for (const a of v) {
    if (typeof a !== 'object' || a === null) continue
    const { pubkey, nome, desde } = a as Record<string, unknown>
    if (typeof pubkey !== 'string' || !/^[0-9a-f]{64}$/.test(pubkey) || vistos.has(pubkey)) continue
    vistos.add(pubkey)
    lista.push({
      pubkey,
      nome: typeof nome === 'string' && nome.trim() ? nome.trim().slice(0, TAMANHO_MAXIMO_NOME) : 'Sem nome',
      desde: typeof desde === 'number' && Number.isFinite(desde) ? desde : 0,
    })
  }
  return lista.slice(0, MAXIMO_AMIGOS)
}

/** Põe o amigo na lista; se já estava, só atualiza o nome (quando vier um). Lista cheia não aceita novo. */
export function adicionarAmigo(lista: Amigo[], pubkey: string, nome: string, agora: number): Amigo[] {
  const limpo = nome.trim().slice(0, TAMANHO_MAXIMO_NOME)
  const existe = lista.some((a) => a.pubkey === pubkey)
  if (existe) return limpo ? lista.map((a) => (a.pubkey === pubkey ? { ...a, nome: limpo } : a)) : lista
  if (lista.length >= MAXIMO_AMIGOS) return lista
  return [...lista, { pubkey, nome: limpo || 'Sem nome', desde: agora }]
}

export const removerAmigo = (lista: Amigo[], pubkey: string): Amigo[] => lista.filter((a) => a.pubkey !== pubkey)

export const ehAmigo = (lista: Amigo[], pubkey: string): boolean => lista.some((a) => a.pubkey === pubkey)

export const ordenarAmigos = (lista: Amigo[]): Amigo[] => [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

// ---- Link para adicionar: #/amigos/<npub>?nome=<nome>

/** O link que você manda para alguém: abre a tela de amigos já com a sua chave e o seu nome preenchidos. */
export function montarLinkDeAmigo(base: string, pubkey: string, nome: string): string {
  const consulta = nome.trim() ? `?nome=${encodeURIComponent(nome.trim().slice(0, TAMANHO_MAXIMO_NOME))}` : ''
  return `${base}#/amigos/${nip19.npubEncode(pubkey)}${consulta}`
}

export function lerLinkDeAmigo(hash: string): { pubkey: string; nome: string } | null {
  const resto = hash.replace(/^.*#\/amigos\//, '')
  if (resto === hash) return null
  const [chave = '', consulta = ''] = resto.split('?')
  const r = lerChaveDoAmigo(chave, null)
  if (!r.ok) return null
  return { pubkey: r.pubkey, nome: (new URLSearchParams(consulta).get('nome') ?? '').trim().slice(0, TAMANHO_MAXIMO_NOME) }
}
