import type { ReactNode } from 'react'

/**
 * Emblema do personagem, como uma ficha de tabuleiro: um símbolo da classe em traço grosso de xilogravura
 * (espada, cajado, adagas, símbolo sagrado). Tudo nos tokens, então vale nos dois temas. Decorativo.
 */

const TINTA = 'fill-tinta stroke-tinta'
const VERMELHO = 'fill-vermelho stroke-tinta'
const ARESTA = { strokeWidth: 1.8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

const espada = (
  <>
    <path d="M24 3.5L28 9V30H20V9Z" className={TINTA} {...ARESTA} />
    <path d="M24 9V30" className="stroke-superficie" strokeWidth={1.2} />
    <rect x="12" y="30" width="24" height="4.5" rx="1" className={VERMELHO} {...ARESTA} />
    <rect x="21.5" y="34.5" width="5" height="7" className={TINTA} {...ARESTA} />
    <circle cx="24" cy="44" r="2.6" className={VERMELHO} {...ARESTA} />
  </>
)

const adaga = (
  <>
    <path d="M24 5L27.5 11V26H20.5V11Z" className={TINTA} {...ARESTA} />
    <rect x="16.5" y="26" width="15" height="3.6" rx="1" className={TINTA} {...ARESTA} />
    <rect x="22.2" y="29.6" width="3.6" height="8" className={TINTA} {...ARESTA} />
    <circle cx="24" cy="40.2" r="2.2" className={VERMELHO} {...ARESTA} />
  </>
)

const EMBLEMAS: Record<string, ReactNode> = {
  guerreira: espada,
  mago: (
    // Cajado com orbe e duas faíscas.
    <>
      <rect x="22.2" y="19" width="3.6" height="25" className={TINTA} {...ARESTA} />
      <path d="M16 15Q16 21 24 21Q32 21 32 15" className="fill-none stroke-tinta" strokeWidth={2.6} strokeLinecap="round" />
      <circle cx="24" cy="12.5" r="6.2" className={VERMELHO} {...ARESTA} />
      <path d="M9 9v6M6 12h6M39 24v6M36 27h6" className="fill-none stroke-tinta" strokeWidth={2.2} strokeLinecap="round" />
    </>
  ),
  ladina: (
    // Duas adagas cruzadas.
    <>
      <g transform="rotate(-30 24 24)">{adaga}</g>
      <g transform="rotate(30 24 24)">{adaga}</g>
    </>
  ),
  clérigo: (
    // Símbolo sagrado: sol de raios retos.
    <>
      <path
        d="M24 3V11M24 37V45M3 24H11M37 24H45M9.2 9.2L14.8 14.8M33.2 33.2L38.8 38.8M38.8 9.2L33.2 14.8M14.8 33.2L9.2 38.8"
        className="fill-none stroke-tinta"
        strokeWidth={3.2}
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="9" className={VERMELHO} {...ARESTA} />
      <circle cx="24" cy="24" r="3.4" className="fill-tinta stroke-tinta" />
    </>
  ),
}

/** Para quem tem nome próprio: elmo, escudo ou machado, sempre o mesmo para o mesmo nome. */
const PADROES: ReactNode[] = [
  // Elmo com viseira.
  <>
    <path d="M10 33V22Q10 8 24 8Q38 8 38 22V33H30V27H18V33Z" className={TINTA} {...ARESTA} />
    <path d="M17 22H31" className="stroke-superficie" strokeWidth={3} strokeLinecap="round" />
    <path d="M24 8V4" className="stroke-tinta" strokeWidth={3} strokeLinecap="round" />
    <path d="M24 4Q30 3 33 8" className="fill-none stroke-vermelho" strokeWidth={3} strokeLinecap="round" />
  </>,
  // Escudo com faixa.
  <>
    <path d="M9 7H39V24Q39 36 24 44Q9 36 9 24Z" className={TINTA} {...ARESTA} />
    <path d="M24 7V44" className="stroke-superficie" strokeWidth={2.4} />
    <path d="M9 21H39" className="stroke-vermelho" strokeWidth={4} />
  </>,
  // Machado.
  <>
    <rect x="22.2" y="6" width="3.6" height="38" className={TINTA} {...ARESTA} />
    <path d="M25.8 7Q44 4 43 22Q42 34 25.8 31Q31 19 25.8 7Z" className={VERMELHO} {...ARESTA} />
    <path d="M22.2 12Q10 14 8 22Q10 28 22.2 28Q18 20 22.2 12Z" className={TINTA} {...ARESTA} />
  </>,
]

/** "Guerreira 2" vira "guerreira"; sem classe conhecida, escolhe um emblema pelo nome. */
function emblemaDe(nome: string): ReactNode {
  const base = nome.trim().replace(/ \d+$/, '').toLowerCase()
  if (EMBLEMAS[base]) return EMBLEMAS[base]
  let soma = 0
  for (let i = 0; i < base.length; i++) soma = Math.imul(soma ^ base.charCodeAt(i), 2654435761) >>> 0
  return PADROES[(soma >>> 16) % PADROES.length]
}

export function Emblema({ nome, className = '' }: { nome: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      {emblemaDe(nome)}
    </svg>
  )
}
