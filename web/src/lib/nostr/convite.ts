import { normalizarRelay, RELAYS_PADRAO } from './relays'

// Convite para uma sala em relays: #/entrar/<sala>/nostr/<chave do mestre>?r=<relay>,<relay>.
// A chave do mestre é a chave do navegador dele (ver chave.ts): quem joga só confia em fotos assinadas por ela.

export interface ConviteNostr {
  salaId: string
  /** Chave pública (hex) que assina a foto da sala. */
  mestre: string
  relays: string[]
}

/** Conexão de quem joga, como fica salva: servidor (só a sala) ou relays (com a chave do mestre e os relays). */
export interface ConexaoSala {
  salaId: string
  /** `senha`: a da sala, se tiver (fica só neste navegador). */
  nostr?: { mestre: string; relays: string[]; senha?: string }
}

const ID_SALA = /^[0-9a-zA-Z-]{8,64}$/
const CHAVE = /^[0-9a-f]{64}$/

/** Com os relays padrão o link não leva a lista (quem joga também usa o padrão). */
export function montarConvite(base: string, c: ConviteNostr): string {
  const padrao = c.relays.length === RELAYS_PADRAO.length && c.relays.every((r, i) => r === RELAYS_PADRAO[i])
  const lista = padrao || c.relays.length === 0 ? '' : `?r=${c.relays.map(encodeURIComponent).join(',')}`
  return `${base}#/entrar/${c.salaId}/nostr/${c.mestre}${lista}`
}

/** Lê o link inteiro ou só o trecho depois de #/entrar/. Devolve null se não for um convite em relays. */
export function lerConviteNostr(texto: string): ConviteNostr | null {
  const resto = texto.trim().replace(/^.*#\/entrar\//, '')
  const [caminho = '', consulta = ''] = resto.split('?')
  const [salaId, marca, mestre] = caminho.split('/')
  if (!salaId || !ID_SALA.test(salaId) || marca !== 'nostr' || !mestre || !CHAVE.test(mestre)) return null
  const pedidos = new URLSearchParams(consulta.replace(/,/g, '&r=')).getAll('r')
  const relays = [...new Set(pedidos.map((r) => normalizarRelay(r)).filter((r): r is string => r !== null))]
  return { salaId, mestre, relays }
}

export function lerConexaoSala(v: unknown): ConexaoSala | null {
  if (typeof v !== 'object' || v === null) return null
  const { salaId, nostr } = v as { salaId?: unknown; nostr?: { mestre?: unknown; relays?: unknown; senha?: unknown } }
  if (typeof salaId !== 'string' || !ID_SALA.test(salaId)) return null
  if (nostr && typeof nostr.mestre === 'string' && CHAVE.test(nostr.mestre) && Array.isArray(nostr.relays)) {
    const relays = nostr.relays.flatMap((r) => (typeof r === 'string' ? [normalizarRelay(r)] : [])).filter((r): r is string => r !== null)
    const senha = typeof nostr.senha === 'string' && nostr.senha.length > 0 ? nostr.senha.slice(0, 100) : undefined
    return { salaId, nostr: { mestre: nostr.mestre, relays, ...(senha ? { senha } : {}) } }
  }
  return { salaId }
}

const CHAVE_BASE = 'rpg:convite:base'

/** Onde o app está para quem recebe o convite: o endereço da página, ou o que o mestre escolheu (GitHub Pages, IP da rede). */
export function baseDoConvite(): string {
  const aqui = `${location.origin}${location.pathname}`
  try {
    return normalizarBase(localStorage.getItem(CHAVE_BASE) ?? '') ?? aqui
  } catch {
    return aqui
  }
}

/** Só http:// e https://; guarda sem o # e sem espaços. */
export function normalizarBase(texto: string): string | null {
  const url = texto.trim().replace(/#.*$/, '')
  return /^https?:\/\/[^\s]+$/.test(url) ? url : null
}

/** Guarda o endereço (vazio volta ao da página) e devolve o que vale. */
export function guardarBase(texto: string): string {
  try {
    const url = normalizarBase(texto)
    if (url) localStorage.setItem(CHAVE_BASE, url)
    else localStorage.removeItem(CHAVE_BASE)
  } catch {
    // sem armazenamento: vale o endereço da página
  }
  return baseDoConvite()
}

/** Endereço que só funciona nesta máquina. */
export const ehLocal = (url: string): boolean => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url)
