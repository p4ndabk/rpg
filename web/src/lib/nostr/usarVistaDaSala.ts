import { useEffect, useState } from 'react'
import { abrirBarramento } from './barramento'
import { chaveDoNavegador } from './chave'
import type { ConviteNostr } from './convite'
import { KIND_FOTO, lerEventoFoto, tagDaSala } from './eventos'
import { desproteger, ehProtegida } from './protegida'

/** O que dá para dizer de uma sala antes de entrar: só o que está na foto pública do mestre. */
export interface VistaDaSala {
  nome: string
  pessoas: number
  /** Quando o mestre publicou pela última vez (segundos). */
  em: number
}

export type EstadoVista =
  | { fase: 'procurando' }
  | { fase: 'achou'; vista: VistaDaSala }
  | { fase: 'nao-achou' }
  /** A sala tem senha e ainda não foi dada, ou a dada não abre (`errada`). */
  | { fase: 'protegida'; errada: boolean }

const ESPERA_MS = 8000

/** Espia a sala nos relays (sem entrar nem publicar nada). Sem convite em relays, fica parado. */
export function usarVistaDaSala(convite: ConviteNostr | null, senha: { chave: CryptoKey; id: string } | null = null): EstadoVista | null {
  const [estado, setEstado] = useState<EstadoVista | null>(null)
  const chave = convite ? `${convite.salaId}|${convite.mestre}|${convite.relays.join(',')}|${senha?.id ?? ''}` : null

  useEffect(() => {
    if (!convite) {
      setEstado(null)
      return
    }
    setEstado({ fase: 'procurando' })
    const b = abrirBarramento(convite.relays, chaveDoNavegador(), () => {})
    let achou = false
    let fechado = false
    b.assinar({ kinds: [KIND_FOTO], authors: [convite.mestre], '#d': [tagDaSala(convite.salaId)] }, (bruto) => {
      void desproteger(bruto, senha?.chave ?? null).then((e) => {
        if (fechado) return
        if (!e) {
          // Trancada e sem senha certa (ou aberta e com senha): a foto existe, então a sala foi achada.
          achou = true
          setEstado({ fase: 'protegida', errada: senha !== null && ehProtegida(bruto) })
          return
        }
        const lida = lerEventoFoto(e)
        if (!lida || lida.foto.sala.id !== convite.salaId) return
        achou = true
        setEstado({ fase: 'achou', vista: { nome: lida.foto.sala.nome, pessoas: lida.foto.jogadores.length + 1, em: e.created_at } })
      })
    })
    const prazo = window.setTimeout(() => {
      if (!achou) setEstado({ fase: 'nao-achou' })
    }, ESPERA_MS)
    return () => {
      fechado = true
      window.clearTimeout(prazo)
      // Só fecha a conexão: mandar o CLOSE da assinatura num socket que ainda está abrindo ou fechando gera erro à toa.
      b.fechar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  return estado
}
