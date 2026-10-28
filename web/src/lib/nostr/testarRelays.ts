// "Testar relays": abre uma conexão com cada relay, faz um pedido pequeno e mede quanto ele leva para responder.
// Não publica nada e fecha a conexão no fim.

export interface ResultadoRelay {
  url: string
  /** Tempo até o relay responder ao pedido (conexão incluída); null se não respondeu. */
  ms: number | null
  motivo?: 'sem-resposta' | 'exige-login'
}

/** O pedaço do WebSocket de que o teste precisa (os testes trocam por um de mentira). */
export interface SoqueteMinimo {
  onopen: ((e: unknown) => void) | null
  onmessage: ((e: { data: unknown }) => void) | null
  onerror: ((e: unknown) => void) | null
  onclose: ((e: unknown) => void) | null
  send: (dado: string) => void
  close: () => void
}

export const LIMITE_TESTE_MS = 6000

export function testarRelay(
  url: string,
  { fabrica = (u: string) => new WebSocket(u) as unknown as SoqueteMinimo, limiteMs = LIMITE_TESTE_MS, agora = () => performance.now() }: { fabrica?: (url: string) => SoqueteMinimo; limiteMs?: number; agora?: () => number } = {},
): Promise<ResultadoRelay> {
  return new Promise((resolver) => {
    let soquete: SoqueteMinimo | null = null
    let pronto = false
    const inicio = agora()
    const terminar = (r: Omit<ResultadoRelay, 'url'>) => {
      if (pronto) return
      pronto = true
      clearTimeout(prazo)
      try {
        soquete?.close()
      } catch {
        // já estava fechado
      }
      resolver({ url, ...r })
    }
    const prazo = setTimeout(() => terminar({ ms: null, motivo: 'sem-resposta' }), limiteMs)
    try {
      soquete = fabrica(url)
    } catch {
      return terminar({ ms: null, motivo: 'sem-resposta' })
    }
    soquete.onopen = () => soquete?.send(JSON.stringify(['REQ', 'rpg-teste', { kinds: [1], limit: 1 }]))
    soquete.onerror = () => terminar({ ms: null, motivo: 'sem-resposta' })
    soquete.onclose = () => terminar({ ms: null, motivo: 'sem-resposta' })
    soquete.onmessage = (e) => {
      let msg: unknown
      try {
        msg = JSON.parse(String(e.data))
      } catch {
        return
      }
      if (!Array.isArray(msg)) return
      // Qualquer resposta ao pedido (eventos, fim da lista) prova que o relay atende; AUTH ou CLOSED "auth-required" é relay que pede login.
      if (msg[0] === 'AUTH' || (msg[0] === 'CLOSED' && /auth/i.test(String(msg[2] ?? '')))) return terminar({ ms: null, motivo: 'exige-login' })
      if (msg[0] === 'EOSE' || msg[0] === 'EVENT') terminar({ ms: Math.max(1, Math.round(agora() - inicio)) })
    }
  })
}

export const testarRelays = (urls: string[], opcoes?: Parameters<typeof testarRelay>[1]): Promise<ResultadoRelay[]> => Promise.all(urls.map((u) => testarRelay(u, opcoes)))

/** Uma frase por relay, para a tela. */
export function textoDoResultado(r: ResultadoRelay): string {
  if (r.ms !== null) return `respondeu em ${r.ms} ms`
  return r.motivo === 'exige-login' ? 'pede login (não serve para a sala)' : 'não respondeu'
}
