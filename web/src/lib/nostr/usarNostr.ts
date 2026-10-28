import { useEffect, useRef, useState } from 'react'
import type { Conexao, Fase } from '../rede/usarServidor'
import type { MensagemCliente, MensagemServidor } from '../rede/protocolo'
import { abrirBarramento, type Barramento } from './barramento'
import { chaveDoNavegador } from './chave'
import { KIND_FOTO, lerEventoFoto, montarPedido, tagDaSala, type Quem } from './eventos'
import { PonteMestre } from './ponteMestre'

// Os dois lados da sala em relays, com a mesma forma de `usarServidor` (fase + enviar), para a tela usar um ou outro.

/** Mestre: roda a ponte no navegador. `relays` nulo desliga. */
export function usarNostrMestre(
  relays: string[] | null,
  inicial: () => MensagemCliente | null,
  aoMensagem: (msg: MensagemServidor) => void,
): Conexao {
  const [fase, setFase] = useState<Fase>('desligada')
  const ponte = useRef<PonteMestre | null>(null)
  const inicialRef = useRef(inicial)
  const aoMensagemRef = useRef(aoMensagem)
  inicialRef.current = inicial
  aoMensagemRef.current = aoMensagem
  const chave = relays?.join(',') ?? null

  useEffect(() => {
    if (!relays) {
      setFase('desligada')
      return
    }
    const barramento = abrirBarramento(relays, chaveDoNavegador(), (f) => {
      setFase(f === 'conectando' ? 'conectando' : f)
      if (f === 'ok') nova.reenviarFoto()
    })
    const nova = new PonteMestre(barramento, (m) => aoMensagemRef.current(m))
    ponte.current = nova
    const abrir = inicialRef.current()
    if (abrir) nova.enviar(abrir)
    return () => {
      nova.fechar()
      barramento.fechar()
      ponte.current = null
      setFase('desligada')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  return { fase, recusa: null, enviar: (msg) => ponte.current?.enviar(msg) }
}

/** Quem joga: ouve a foto assinada pela chave do mestre e manda pedidos. `convite` nulo desliga. */
export function usarNostrJogador(
  convite: { salaId: string; mestre: string; relays: string[] } | null,
  inicial: () => MensagemCliente | null,
  aoMensagem: (msg: MensagemServidor) => void,
): Conexao {
  const [fase, setFase] = useState<Fase>('desligada')
  const barramento = useRef<Barramento | null>(null)
  const quem = useRef<Quem | null>(null)
  const inicialRef = useRef(inicial)
  const aoMensagemRef = useRef(aoMensagem)
  inicialRef.current = inicial
  aoMensagemRef.current = aoMensagem
  const chave = convite ? `${convite.salaId}|${convite.mestre}|${convite.relays.join(',')}` : null

  function pedir(b: Barramento, msg: MensagemCliente) {
    if (quem.current && convite) b.publicar(montarPedido(convite.salaId, quem.current, msg, Math.floor(Date.now() / 1000)))
  }

  useEffect(() => {
    if (!convite) {
      setFase('desligada')
      return
    }
    const b = abrirBarramento(convite.relays, chaveDoNavegador(), (f) => setFase(f))
    barramento.current = b
    const entrar = inicialRef.current()
    if (entrar?.t === 'entrar') quem.current = { pubkey: entrar.pubkey, nome: entrar.nome }
    let ultimo = 0
    let primeira = true
    let avisouEm = 0
    const parar = b.assinar({ kinds: [KIND_FOTO], authors: [convite.mestre], '#d': [tagDaSala(convite.salaId)] }, (e) => {
      if (e.created_at <= ultimo) return
      const lida = lerEventoFoto(e)
      if (!lida || lida.foto.sala.id !== convite.salaId) return
      ultimo = e.created_at
      aoMensagemRef.current(primeira ? { t: 'ola', papel: 'jogador', versao: lida.versao, foto: lida.foto } : { t: 'foto', versao: lida.versao, foto: lida.foto })
      primeira = false
      // O mestre ainda não me conhece (pedido perdido ou ele recarregou): pede de novo, no máximo a cada 10 s.
      const eu = quem.current
      if (eu && entrar && !lida.foto.jogadores.some((j) => j.pubkey === eu.pubkey) && Date.now() - avisouEm > 10_000) {
        avisouEm = Date.now()
        pedir(b, entrar)
      }
    })
    if (entrar) pedir(b, entrar)
    return () => {
      parar()
      b.fechar()
      barramento.current = null
      setFase('desligada')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  return {
    fase,
    recusa: null,
    enviar: (msg) => {
      if (barramento.current) pedir(barramento.current, msg)
    },
  }
}
