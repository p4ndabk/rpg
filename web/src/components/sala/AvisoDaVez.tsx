import { useEffect, useRef, useState } from 'react'
import { somLigado } from '../../lib/preferencias'
import { daVez, marcaDaVez, vezChegouParaMim, type Sala } from '../../lib/sala'
import { Ficha } from './Ficha'

const DURACAO_MS = 4500

/** Dois toques curtos e suaves. Pode ser barrado pelo navegador se a pessoa ainda não tocou na página; aí fica só o aviso visual. */
export function tocarAvisoDeVez() {
  try {
    const ctx = new AudioContext()
    const agora = ctx.currentTime
    ;[660, 880].forEach((hz, i) => {
      const osc = ctx.createOscillator()
      const ganho = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = hz
      ganho.gain.setValueAtTime(0.0001, agora + i * 0.16)
      ganho.gain.exponentialRampToValueAtTime(0.18, agora + i * 0.16 + 0.02)
      ganho.gain.exponentialRampToValueAtTime(0.0001, agora + i * 0.16 + 0.22)
      osc.connect(ganho).connect(ctx.destination)
      osc.start(agora + i * 0.16)
      osc.stop(agora + i * 0.16 + 0.25)
    })
    window.setTimeout(() => void ctx.close(), 800)
  } catch {
    // sem áudio: só o aviso na tela
  }
}

interface AvisoDaVezProps {
  /** A sala como a pessoa a vê. */
  sala: Sala
  pubkey: string
}

/**
 * Avisa quem joga quando chega a sua vez no combate: cartão no tabuleiro, um toque de som e o título da aba
 * ("Sua vez!"), que também chama a atenção com a aba em segundo plano. Só aparece para a peça da pessoa.
 */
export function AvisoDaVez({ sala, pubkey }: AvisoDaVezProps) {
  const vez = daVez(sala)
  // Começa com a vez que já existe ao abrir a tela: recarregar no meio do turno não toca de novo.
  const marca = marcaDaVez(sala)
  const anterior = useRef<string | undefined>(marca)
  const [mostrando, setMostrando] = useState(false)
  const minhaVez = vez !== undefined && vez.dono === pubkey

  useEffect(() => {
    if (vezChegouParaMim(anterior.current, sala, pubkey)) {
      setMostrando(true)
      if (somLigado()) tocarAvisoDeVez()
    } else if (!minhaVez) {
      setMostrando(false)
    }
    anterior.current = marca
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marca, pubkey, minhaVez])

  // O cartão some sozinho; o relógio não reinicia quando a sala muda por outro motivo (um dano, um movimento).
  useEffect(() => {
    if (!mostrando) return
    const t = window.setTimeout(() => setMostrando(false), DURACAO_MS)
    return () => clearTimeout(t)
  }, [mostrando])

  // Título da aba: "Sua vez!" enquanto for a sua vez; pisca se a aba estiver escondida.
  useEffect(() => {
    if (!minhaVez) return
    const original = document.title
    let aceso = true
    const pintar = () => {
      document.title = document.hidden && !aceso ? original : `● Sua vez! · ${original}`
      aceso = !aceso
    }
    pintar()
    const t = window.setInterval(pintar, 1000)
    return () => {
      clearInterval(t)
      document.title = original
    }
  }, [minhaVez])

  if (!mostrando || !vez) return null
  return (
    <div role="status" aria-live="assertive" className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-4">
      <div className="flex animate-carimbar items-center gap-3 rounded-cordel border-2 border-borda bg-vermelho px-4 py-2 text-sobre-vermelho shadow-carimbo">
        <span className="rounded-cordel bg-superficie p-0.5">
          <Ficha peca={vez} />
        </span>
        <p>
          <span className="block font-display text-2xl leading-tight uppercase">Sua vez!</span>
          <span className="block text-sm font-bold">{vez.nome} age agora.</span>
        </p>
      </div>
    </div>
  )
}
