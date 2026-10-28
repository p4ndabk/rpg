import { useEffect, useRef, useState } from 'react'
import { SINAL_MS } from '../presenca'
import type { Conexao, Fase, Presenca } from '../rede/usarServidor'
import type { MensagemCliente, MensagemServidor } from '../rede/protocolo'
import { abrirBarramento, type Barramento } from './barramento'
import { chaveDoNavegador } from './chave'
import { KIND_FOTO, lerEventoFoto, lerRecusa, montarPedido, tagDaSala, type Quem } from './eventos'
import { PonteMestre } from './ponteMestre'

const ESPERA_REENVIO_MS = 8000

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
  const [presenca, setPresenca] = useState<Presenca>({ mestreEm: null, vistos: {} })
  const [recusadas, setRecusadas] = useState({ n: 0, acao: '' })
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
    let ultimaVersao = -1
    let primeira = true
    let avisouEm = 0
    let recebeu = false
    const parar = b.assinar({ kinds: [KIND_FOTO], authors: [convite.mestre], '#d': [tagDaSala(convite.salaId)] }, (e) => {
      if (e.created_at <= ultimo) return
      const lida = lerEventoFoto(e)
      if (!lida || lida.foto.sala.id !== convite.salaId) return
      ultimo = e.created_at
      recebeu = true
      // A foto de cada minuto é também o sinal do mestre: guarda a hora e só mexe na sala se algo mudou.
      setPresenca({ mestreEm: e.created_at, vistos: lida.foto.vistos ?? {} })
      const recusa = lerRecusa(e)
      const minha = recusa !== null && recusa.pubkey === quem.current?.pubkey
      if (minha) setRecusadas((r) => ({ n: r.n + 1, acao: recusa.acao }))
      if (primeira || minha || lida.versao !== ultimaVersao) {
        aoMensagemRef.current(primeira ? { t: 'ola', papel: 'jogador', versao: lida.versao, foto: lida.foto } : { t: 'foto', versao: lida.versao, foto: lida.foto })
      }
      ultimaVersao = lida.versao
      primeira = false
      // O mestre ainda não me conhece (pedido perdido ou ele recarregou): pede de novo, no máximo a cada 10 s.
      const eu = quem.current
      if (eu && entrar && !lida.foto.jogadores.some((j) => j.pubkey === eu.pubkey) && Date.now() - avisouEm > 10_000) {
        avisouEm = Date.now()
        pedir(b, entrar)
      }
    })
    if (entrar) pedir(b, entrar)
    // Sinal de vida a cada minuto, para a Mesa saber quem está online.
    const sinal = entrar ? window.setInterval(() => pedir(b, { t: 'presenca' }), SINAL_MS) : undefined
    // Nenhuma foto ainda (o pedido ou a foto se perdeu num relay): bate na porta de novo a cada 8 s. Cada "entrar" faz o mestre publicar a foto na hora.
    const reenvio = entrar ? window.setInterval(() => !recebeu && pedir(b, entrar), ESPERA_REENVIO_MS) : undefined
    return () => {
      window.clearInterval(reenvio)
      window.clearInterval(sinal)
      setPresenca({ mestreEm: null, vistos: {} })
      parar()
      b.fechar()
      barramento.current = null
      setFase('desligada')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  return {
    fase,
    presenca,
    recusadas,
    recusa: null,
    enviar: (msg) => {
      if (barramento.current) pedir(barramento.current, msg)
    },
  }
}
