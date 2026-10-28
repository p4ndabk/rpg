import { useEffect, useState } from 'react'
import { abrirBarramento } from './barramento'
import { chaveDoNavegador } from './chave'
import type { ConviteNostr } from './convite'
import { KIND_FOTO, lerEventoFoto, tagDaSala } from './eventos'

/** O que dá para dizer de uma sala antes de entrar: só o que está na foto pública do mestre. */
export interface VistaDaSala {
  nome: string
  pessoas: number
  /** Quando o mestre publicou pela última vez (segundos). */
  em: number
}

export type EstadoVista = { fase: 'procurando' } | { fase: 'achou'; vista: VistaDaSala } | { fase: 'nao-achou' }

const ESPERA_MS = 8000

/** Espia a sala nos relays (sem entrar nem publicar nada). Sem convite em relays, fica parado. */
export function usarVistaDaSala(convite: ConviteNostr | null): EstadoVista | null {
  const [estado, setEstado] = useState<EstadoVista | null>(null)
  const chave = convite ? `${convite.salaId}|${convite.mestre}|${convite.relays.join(',')}` : null

  useEffect(() => {
    if (!convite) {
      setEstado(null)
      return
    }
    setEstado({ fase: 'procurando' })
    const b = abrirBarramento(convite.relays, chaveDoNavegador(), () => {})
    let achou = false
    b.assinar({ kinds: [KIND_FOTO], authors: [convite.mestre], '#d': [tagDaSala(convite.salaId)] }, (e) => {
      const lida = lerEventoFoto(e)
      if (!lida || lida.foto.sala.id !== convite.salaId) return
      achou = true
      setEstado({ fase: 'achou', vista: { nome: lida.foto.sala.nome, pessoas: lida.foto.jogadores.length + 1, em: e.created_at } })
    })
    const prazo = window.setTimeout(() => {
      if (!achou) setEstado({ fase: 'nao-achou' })
    }, ESPERA_MS)
    return () => {
      window.clearTimeout(prazo)
      // Só fecha a conexão: mandar o CLOSE da assinatura num socket que ainda está abrindo ou fechando gera erro à toa.
      b.fechar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  return estado
}
