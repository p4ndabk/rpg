// Quem está na mesa agora. Em relays não há conexão aberta para olhar, então cada navegador "dá sinal" a cada minuto:
// quem joga manda um pedido de presença e o mestre republica a foto com a hora do último sinal de cada pessoa.

/** Intervalo entre sinais (ms). */
export const SINAL_MS = 60_000
/** Quem deu sinal há menos que isto (segundos) está online: cabe um sinal perdido. */
export const ONLINE_S = 150
/** O mestre sem sinal por mais que isto (segundos) provavelmente fechou a aba. */
export const MESTRE_AUSENTE_S = 180

/** Pubkey → hora (segundos) do último sinal visto pelo mestre. */
export type Vistos = Record<string, number>

/** Segundos desde `em` (segundos). Nunca negativo, para relógios que não batem por pouco. */
export function idadeS(agoraMs: number, emS: number): number {
  return Math.max(0, Math.floor(agoraMs / 1000 - emS))
}

export const estaOnline = (agoraMs: number, emS: number | undefined): boolean => emS !== undefined && idadeS(agoraMs, emS) <= ONLINE_S

/** "agora", "há 5 min", "há 2 h", "há 3 dias". */
export function haQuanto(segundos: number): string {
  if (segundos < 60) return 'agora'
  const min = Math.floor(segundos / 60)
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  return h < 24 ? `há ${h} h` : `há ${Math.floor(h / 24)} ${Math.floor(h / 24) === 1 ? 'dia' : 'dias'}`
}

export const mestreAusente = (agoraMs: number, emS: number): boolean => idadeS(agoraMs, emS) > MESTRE_AUSENTE_S

/** Lê os sinais de um evento ou arquivo, descartando o que não for pubkey → número. */
export function lerVistos(v: unknown): Vistos {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {}
  const saida: Vistos = {}
  for (const [k, n] of Object.entries(v)) if (/^[0-9a-f]{64}$/.test(k) && typeof n === 'number' && Number.isFinite(n) && n > 0) saida[k] = Math.floor(n)
  return saida
}

/** O que o navegador sabe da mesa num instante: sinais das pessoas, última foto do mestre (null = nenhuma ainda) e a hora. */
export interface Presenca {
  vistos: Vistos
  mestreEm: number | null
  agoraMs: number
}

/**
 * Online por sinal recente. O próprio navegador está sempre online (e, para o mestre, ele mesmo).
 * O mestre, visto por quem joga, é a última foto dele.
 */
export function situacaoDe(pubkey: string, { eu, mestre, presenca }: { eu: string; mestre?: string; presenca: Presenca }): { online: boolean; texto: string } {
  if (pubkey === eu) return { online: true, texto: 'online' }
  const ehMestre = pubkey === mestre
  const em = ehMestre ? presenca.mestreEm : (presenca.vistos[pubkey] ?? null)
  if (em === null) return { online: false, texto: ehMestre ? 'sem sinal ainda' : 'ainda não deu sinal' }
  const online = ehMestre ? !mestreAusente(presenca.agoraMs, em) : estaOnline(presenca.agoraMs, em)
  return online ? { online: true, texto: 'online' } : { online: false, texto: `visto ${haQuanto(idadeS(presenca.agoraMs, em))}` }
}
