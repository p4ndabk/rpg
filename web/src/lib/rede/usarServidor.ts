import { useEffect, useRef, useState } from 'react'
import type { Vistos } from '../presenca'
import type { MensagemCliente, MensagemServidor } from './protocolo'

export type Fase = 'desligada' | 'conectando' | 'ok' | 'erro'

/** Quem está na mesa agora, só nos relays (no servidor a conexão aberta já diz). */
export interface Presenca {
  /** Hora (segundos) da última foto do mestre; null = ainda não chegou nenhuma. */
  mestreEm: number | null
  vistos: Vistos
}

export interface Conexao {
  fase: Fase
  presenca?: Presenca
  /** Só nos relays: sobe a cada jogada sua que o mestre recusou (a tela já voltou ao real). */
  recusadas?: { n: number; acao: string }
  /** Motivo da última recusa do servidor, se houve. */
  recusa: Extract<MensagemServidor, { t: 'recusado' }>['motivo'] | null
  enviar: (msg: MensagemCliente) => void
}

const ESPERA_INICIAL_MS = 1000
const ESPERA_MAXIMA_MS = 15000

/**
 * Mantém um WebSocket com o servidor da sala. A cada (re)conexão manda `inicial` (abrir ou entrar) e reconecta
 * sozinho, com espera crescente. `aoMensagem` recebe o que o servidor mandar.
 */
export function usarServidor(
  url: string | null,
  inicial: () => MensagemCliente | null,
  aoMensagem: (msg: MensagemServidor) => void,
): Conexao {
  const [fase, setFase] = useState<Fase>('desligada')
  const [recusa, setRecusa] = useState<Conexao['recusa']>(null)
  const socket = useRef<WebSocket | null>(null)
  const inicialRef = useRef(inicial)
  const aoMensagemRef = useRef(aoMensagem)
  inicialRef.current = inicial
  aoMensagemRef.current = aoMensagem

  useEffect(() => {
    if (!url) {
      setFase('desligada')
      return
    }
    let vivo = true
    let tentativa = 0
    let timer: number | undefined

    function conectar() {
      if (!vivo) return
      setFase('conectando')
      let ws: WebSocket
      try {
        ws = new WebSocket(url!)
      } catch {
        setFase('erro')
        return
      }
      socket.current = ws
      ws.onopen = () => {
        tentativa = 0
        setRecusa(null)
        const msg = inicialRef.current()
        if (msg) ws.send(JSON.stringify(msg))
      }
      ws.onmessage = (e) => {
        let msg: MensagemServidor
        try {
          msg = JSON.parse(String(e.data)) as MensagemServidor
        } catch {
          return
        }
        if (msg.t === 'recusado') setRecusa(msg.motivo)
        else {
          setFase('ok')
          aoMensagemRef.current(msg)
        }
      }
      ws.onclose = () => {
        if (socket.current === ws) socket.current = null
        if (!vivo) return
        setFase('erro')
        timer = window.setTimeout(conectar, Math.min(ESPERA_INICIAL_MS * 2 ** tentativa++, ESPERA_MAXIMA_MS))
      }
      ws.onerror = () => ws.close()
    }

    conectar()
    return () => {
      vivo = false
      clearTimeout(timer)
      socket.current?.close()
      socket.current = null
      setFase('desligada')
    }
  }, [url])

  return {
    fase,
    recusa,
    enviar: (msg) => {
      const ws = socket.current
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    },
  }
}
