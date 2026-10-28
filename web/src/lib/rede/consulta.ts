import type { MensagemCliente, MensagemServidor } from './protocolo'

export type Resposta<T extends MensagemServidor> =
  | { ok: true; msg: T }
  | { ok: false; motivo: 'sem-conexao' | 'tempo' | Extract<MensagemServidor, { t: 'recusado' }>['motivo'] }

/**
 * Faz uma pergunta ao servidor numa conexão curta: abre, manda, espera a resposta que `quer` aceita e fecha.
 * Serve para a lista de salas e para trazer a sala do mestre para este navegador.
 */
export function pedir<T extends MensagemServidor>(
  url: string,
  msg: MensagemCliente,
  quer: (m: MensagemServidor) => m is T,
  tempoMs = 5000,
): Promise<Resposta<T>> {
  return new Promise((resolver) => {
    let ws: WebSocket
    let acabou = false
    const acabar = (r: Resposta<T>) => {
      if (acabou) return
      acabou = true
      clearTimeout(limite)
      ws.close()
      resolver(r)
    }
    const limite = setTimeout(() => acabar({ ok: false, motivo: 'tempo' }), tempoMs)
    try {
      ws = new WebSocket(url)
    } catch {
      clearTimeout(limite)
      return resolver({ ok: false, motivo: 'sem-conexao' })
    }
    ws.onopen = () => ws.send(JSON.stringify(msg))
    ws.onerror = () => acabar({ ok: false, motivo: 'sem-conexao' })
    ws.onclose = () => acabar({ ok: false, motivo: 'sem-conexao' })
    ws.onmessage = (e) => {
      let m: MensagemServidor
      try {
        m = JSON.parse(String(e.data)) as MensagemServidor
      } catch {
        return
      }
      if (m.t === 'recusado') acabar({ ok: false, motivo: m.motivo })
      else if (quer(m)) acabar({ ok: true, msg: m })
    }
  })
}
