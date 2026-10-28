import { finalizeEvent, type Event, type EventTemplate, type Filter } from 'nostr-tools'
import { SimplePool } from 'nostr-tools/pool'

export type FaseBarramento = 'conectando' | 'ok' | 'erro'

/** O que a sala precisa dos relays: publicar e ouvir. Os testes trocam isto por uma versão em memória. */
export interface Barramento {
  /** Assina com a chave do navegador e manda a todos os relays. Nunca lança. */
  publicar: (modelo: EventTemplate) => void
  /** Ouve os eventos que casam com o filtro. Devolve como parar. */
  assinar: (filtro: Filter, aoEvento: (e: Event) => void) => () => void
  fechar: () => void
}

const INTERVALO_FASE_MS = 2000
// Sem nenhum relay conectado depois disto, a fase vira "erro" (a conexão continua tentando).
const TEMPO_ATE_ERRO_MS = 12_000

/** Liga a sala aos relays pelo SimplePool do nostr-tools (reconecta sozinho). `aoFase` diz se há algum relay no ar. */
export function abrirBarramento(relays: string[], chave: Uint8Array, aoFase: (f: FaseBarramento) => void): Barramento {
  const pool = new SimplePool({ enablePing: true, enableReconnect: true })
  const inicio = Date.now()
  let fechado = false
  let ultima: FaseBarramento | null = null

  const conferir = () => {
    if (fechado) return
    // O pool guarda a URL com "/" no fim; a lista da pessoa pode vir sem.
    const noAr = new Set([...pool.listConnectionStatus()].filter(([, ligado]) => ligado).map(([url]) => url.replace(/\/+$/, '')))
    const conectados = relays.some((r) => noAr.has(r))
    const fase: FaseBarramento = conectados ? 'ok' : Date.now() - inicio > TEMPO_ATE_ERRO_MS ? 'erro' : 'conectando'
    if (fase !== ultima) {
      ultima = fase
      aoFase(fase)
    }
  }
  aoFase('conectando')
  const sonda = window.setInterval(conferir, INTERVALO_FASE_MS)

  return {
    publicar: (modelo) => {
      if (fechado) return
      const evento = finalizeEvent(modelo, chave)
      // Relay que recusa ou demora não pára a sala: os outros recebem.
      for (const p of pool.publish(relays, evento)) p.catch(() => {})
    },
    assinar: (filtro, aoEvento) => {
      const sub = pool.subscribeMany(relays, filtro, { onevent: aoEvento })
      return () => sub.close()
    },
    fechar: () => {
      fechado = true
      clearInterval(sonda)
      pool.close(relays)
      pool.destroy()
    },
  }
}
