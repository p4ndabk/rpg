// Relays públicos usados pela sala. Lista do Voz (testada em 2026-10-18): o relay.damus.io pede AUTH e o nos.lol
// não conectou, então ficaram de fora.

export const RELAYS_PADRAO: readonly string[] = ['wss://relay.primal.net', 'wss://purplerelay.com', 'wss://relay.snort.social']
export const MAXIMO_RELAYS = 6
const CHAVE_RELAYS = 'rpg:nostr:relays'

/** Só relays ws:// e wss://; tira a barra final para "wss://x" e "wss://x/" serem o mesmo. */
export function normalizarRelay(bruto: string): string | null {
  const url = bruto.trim().replace(/\/+$/, '')
  return /^wss?:\/\/[^\s/?,]+$/.test(url) ? url : null
}

/** Lê uma lista digitada (um por linha, ou separados por vírgula ou espaço). */
export function lerListaDeRelays(texto: string): string[] {
  const lista = texto.split(/[\s,]+/).map(normalizarRelay).filter((r): r is string => r !== null)
  return [...new Set(lista)].slice(0, MAXIMO_RELAYS)
}

export function relaysDoMestre(): string[] {
  try {
    const salvo = lerListaDeRelays((JSON.parse(localStorage.getItem(CHAVE_RELAYS) ?? 'null') as string[] | null)?.join(' ') ?? '')
    return salvo.length > 0 ? salvo : [...RELAYS_PADRAO]
  } catch {
    return [...RELAYS_PADRAO]
  }
}

/** Guarda a lista escolhida (vazia volta ao padrão) e devolve a que vale. */
export function guardarRelays(texto: string): string[] {
  try {
    const lista = lerListaDeRelays(texto)
    if (lista.length > 0) localStorage.setItem(CHAVE_RELAYS, JSON.stringify(lista))
    else localStorage.removeItem(CHAVE_RELAYS)
  } catch {
    // sem armazenamento: vale o padrão
  }
  return relaysDoMestre()
}
