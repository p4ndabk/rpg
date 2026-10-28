import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { usarArmazenado } from '../../lib/armazenamento'
import { JORNADA_INICIAL, lerJornada, registrarEvento, type Evento, type Jornada, type Novidade } from '../../lib/jornada'
import { IconeCheck, IconeSelo } from '../ui/Icones'

interface ValorJornada {
  jornada: Jornada
  registrar: (e: Evento) => void
  /** Troca a jornada (por uma cópia salva). */
  restaurar: (j: Jornada) => void
}

const Contexto = createContext<ValorJornada | null>(null)

/** Um aviso por evento, juntando tudo o que ele rendeu: missão, selos e nível. */
interface Aviso {
  id: string
  novidades: Novidade[]
}

const DURACAO_AVISO = 6000
// Primeiro o resultado, depois a recompensa: o aviso espera o carimbo da rolagem assentar.
const ATRASO_AVISO = 900
// Fila: no máximo dois avisos na tela; o próximo aparece quando um sai. Nenhuma novidade se perde.
const AVISOS_VISIVEIS = 2

// Nível é a notícia maior; depois selo; depois missão.
const PESO: Record<Novidade['tipo'], number> = { nivel: 0, conquista: 1, missao: 2 }

/** Guarda a jornada (XP, missões, selos) e mostra os avisos de novidade. */
export function ProvedorJornada({ children }: { children: ReactNode }) {
  const [jornada, setJornada] = usarArmazenado<Jornada>('rpg:jornada', JORNADA_INICIAL, lerJornada)
  const [avisos, setAvisos] = useState<Aviso[]>([])
  // Vários eventos podem chegar antes do próximo render; a ref garante que cada um parte do anterior.
  const atual = useRef(jornada)

  const registrar = useCallback(
    (e: Evento) => {
      const { jornada: nova, novidades } = registrarEvento(atual.current, e)
      atual.current = nova
      setJornada(nova)
      if (novidades.length) {
        const ordenadas = [...novidades].sort((a, b) => PESO[a.tipo] - PESO[b.tipo])
        window.setTimeout(() => setAvisos((a) => [...a, { id: crypto.randomUUID(), novidades: ordenadas }]), ATRASO_AVISO)
      }
    },
    [setJornada],
  )

  const restaurar = useCallback(
    (j: Jornada) => {
      atual.current = j
      setJornada(j)
    },
    [setJornada],
  )

  const dispensar = useCallback((id: string) => setAvisos((a) => a.filter((x) => x.id !== id)), [])

  return (
    <Contexto.Provider value={{ jornada, registrar, restaurar }}>
      {children}
      <Avisos avisos={avisos} aoDispensar={dispensar} />
    </Contexto.Provider>
  )
}

export function usarJornada(): ValorJornada {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('usarJornada precisa estar dentro de ProvedorJornada')
  return valor
}

const CHAMADA: Record<Novidade['tipo'], string> = {
  missao: 'Missão cumprida',
  conquista: 'Selo conquistado',
  nivel: 'Subiu de nível',
}

function Avisos({ avisos, aoDispensar }: { avisos: Aviso[]; aoDispensar: (id: string) => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      // No celular, os avisos descem do topo: o pé da tela é a zona do polegar e não pode ficar coberto.
      // Na tela larga, ficam à esquerda, na altura do meio: a direita é da bandeja de dados e o pé é do painel do mestre.
      className="pointer-events-none fixed inset-x-4 top-18 z-30 flex flex-col items-stretch gap-2 sm:inset-x-auto sm:top-auto sm:right-6 sm:bottom-6 sm:w-80 sm:gap-3 lg:top-1/3 lg:right-auto lg:bottom-auto lg:left-6"
    >
      {avisos.slice(0, AVISOS_VISIVEIS).map((a) => (
        <ItemAviso key={a.id} aviso={a} aoDispensar={aoDispensar} />
      ))}
    </div>
  )
}

function ItemAviso({ aviso, aoDispensar }: { aviso: Aviso; aoDispensar: (id: string) => void }) {
  const [pausado, setPausado] = useState(false)
  // Some sozinho, mas espera enquanto o foco estiver no botão de fechar.
  useEffect(() => {
    if (pausado) return
    const t = window.setTimeout(() => aoDispensar(aviso.id), DURACAO_AVISO)
    return () => clearTimeout(t)
  }, [aviso.id, aoDispensar, pausado])

  const [principal, ...outras] = aviso.novidades
  const nivel = principal!.tipo === 'nivel'
  const xp = aviso.novidades.reduce((soma, n) => soma + (n.xp ?? 0), 0)

  return (
    // O aviso não segura o toque: quem toca nele acerta o que está embaixo. Só o × é clicável.
    <div
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      // Compacto (título e XP) para não cobrir o tabuleiro nem o resultado. Os detalhes ficam para o leitor de tela e para o Início.
      className={`flex animate-carimbar items-center gap-2 rounded-cordel border-2 border-borda py-1 pr-1 pl-3 shadow-carimbo ${
        nivel ? 'bg-tinta text-fundo' : 'bg-superficie text-tinta'
      }`}
    >
      <span className={`shrink-0 ${nivel ? '' : 'text-verde'}`}>
        {principal!.tipo === 'missao' ? <IconeCheck className="size-6" /> : <IconeSelo className="size-6" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-bold tracking-wide uppercase max-sm:sr-only ${nivel ? '' : 'text-verde'}`}>{CHAMADA[principal!.tipo]}</p>
        <p className="truncate font-display leading-tight sm:text-lg">{principal!.titulo}</p>
        <p className="sr-only">{principal!.texto}</p>
        <p className={`text-sm font-bold ${nivel ? '' : 'text-verde'}`} aria-hidden="true">
          {xp > 0 && `+${xp} XP`}
          {outras.length > 0 && ` · e mais ${outras.length}`}
        </p>
        {outras.length > 0 && (
          <ul className="sr-only">
            {outras.map((n) => (
              <li key={n.tipo + n.titulo} className="flex items-center gap-1.5">
                <span className={nivel ? '' : 'text-verde'}>
                  {n.tipo === 'missao' ? <IconeCheck className="size-4" /> : <IconeSelo className="size-4" />}
                </span>
                <span className="min-w-0">
                  <span className="sr-only">{CHAMADA[n.tipo]}: </span>
                  <strong>{n.titulo}</strong>
                </span>
              </li>
            ))}
          </ul>
        )}
        {xp > 0 && <p className="sr-only">+{xp} XP</p>}
      </div>
      <button
        type="button"
        onClick={() => aoDispensar(aviso.id)}
        aria-label="Fechar aviso"
        className="pointer-events-auto grid min-h-11 min-w-11 shrink-0 place-items-center text-xl font-bold"
      >
        ×
      </button>
    </div>
  )
}
