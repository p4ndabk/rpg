import type { Terreno as TipoTerreno } from '../../lib/sala'

/**
 * Desenho de cada terreno, no traço grosso da xilogravura e só com os tokens do guia (sem cor extra).
 * Ocupa a casa inteira, por baixo das peças. Decorativo: o nome do terreno vai no rótulo da casa.
 */
const DESENHOS: Record<TipoTerreno, React.ReactNode> = {
  parede: (
    <>
      <rect width="40" height="40" className="fill-tinta" />
      <path d="M0 10H40M0 20H40M0 30H40M10 0V10M30 0V10M20 10V20M0 10V20M40 10V20M10 20V30M30 20V30M20 30V40M0 30V40M40 30V40" className="stroke-superficie" strokeWidth="1.5" fill="none" />
    </>
  ),
  porta: (
    <>
      <rect x="7" y="4" width="26" height="34" className="fill-superficie stroke-tinta" strokeWidth="3" />
      <path d="M20 4V38M7 21H33" className="stroke-tinta" strokeWidth="1.5" />
      <circle cx="27" cy="22" r="2.2" className="fill-tinta" />
    </>
  ),
  agua: (
    <>
      <rect width="40" height="40" className="fill-tinta" opacity=".1" />
      <path d="M2 12Q8 7 14 12T26 12T38 12M2 22Q8 17 14 22T26 22T38 22M2 32Q8 27 14 32T26 32T38 32" className="stroke-tinta-suave" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </>
  ),
  lava: (
    <>
      <rect width="40" height="40" className="fill-vermelho" opacity=".85" />
      <path d="M-4 14L14 -4M-4 28L28 -4M-4 42L42 -4M12 44L44 12M26 44L44 26" className="stroke-tinta" strokeWidth="1.6" />
      <circle cx="12" cy="26" r="3" className="fill-superficie" opacity=".7" />
      <circle cx="28" cy="14" r="2.2" className="fill-superficie" opacity=".7" />
    </>
  ),
  arvore: (
    <>
      <rect x="18" y="28" width="4" height="10" className="fill-tinta" />
      <path d="M20 3L31 17H9Z M20 11L34 27H6Z" className="fill-tinta stroke-superficie" strokeWidth="1.4" strokeLinejoin="round" />
    </>
  ),
  pedra: <path d="M5 31L9 15L19 8L32 13L36 31Z M19 8L21 22L36 31 M9 15L21 22L5 31" className="fill-tinta-suave stroke-tinta" strokeWidth="2" strokeLinejoin="round" />,
  buraco: (
    <>
      <ellipse cx="20" cy="22" rx="15" ry="11" className="fill-tinta" />
      <ellipse cx="20" cy="22" rx="9" ry="6" className="fill-none stroke-superficie" strokeWidth="1.6" />
    </>
  ),
}

export function Terreno({ tipo, className = '' }: { tipo: TipoTerreno; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={`pointer-events-none absolute inset-0 z-0 size-full ${className}`}>
      {DESENHOS[tipo]}
    </svg>
  )
}

/** O mesmo desenho, solto e em miniatura, para a paleta do mestre. */
export function AmostraTerreno({ tipo, className = 'size-9' }: { tipo: TipoTerreno; className?: string }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-cordel border-2 border-borda bg-superficie ${className}`}>
      <Terreno tipo={tipo} />
    </span>
  )
}
