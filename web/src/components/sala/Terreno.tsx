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
  grade: (
    <>
      <rect width="40" height="40" className="fill-tinta" opacity=".08" />
      <path d="M9 3V37M17 3V37M25 3V37M33 3V37M3 10H37M3 30H37" className="stroke-tinta" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  coluna: (
    <>
      <rect x="9" y="31" width="22" height="6" className="fill-tinta stroke-tinta" strokeWidth="1" />
      <rect x="9" y="3" width="22" height="6" className="fill-tinta stroke-tinta" strokeWidth="1" />
      <rect x="13" y="9" width="14" height="22" className="fill-tinta-suave stroke-tinta" strokeWidth="2" />
      <path d="M18 10V30M22 10V30" className="stroke-tinta" strokeWidth="1.2" />
    </>
  ),
  escada: (
    <>
      <rect x="2" y="2" width="36" height="36" className="fill-superficie stroke-tinta" strokeWidth="2.4" />
      <rect x="2" y="2" width="36" height="7" className="fill-tinta" opacity=".6" />
      <rect x="2" y="9" width="36" height="7" className="fill-tinta" opacity=".45" />
      <rect x="2" y="16" width="36" height="7" className="fill-tinta" opacity=".3" />
      <rect x="2" y="23" width="36" height="7" className="fill-tinta" opacity=".15" />
      <path d="M2 9H38M2 16H38M2 23H38M2 30H38" className="stroke-tinta" strokeWidth="1.8" />
    </>
  ),
  cerca: (
    <>
      <path d="M2 14H38M2 27H38" className="stroke-tinta" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M7 6V36M20 6V36M33 6V36" className="stroke-tinta" strokeWidth="4.4" strokeLinecap="round" />
    </>
  ),
  ponte: (
    <>
      <rect width="40" height="40" className="fill-tinta" opacity=".1" />
      <path d="M0 5H40M0 35H40" className="stroke-tinta" strokeWidth="3.4" />
      <path d="M6 5V35M14 5V35M22 5V35M30 5V35M38 5V35" className="stroke-tinta" strokeWidth="2.2" />
    </>
  ),
  mato: (
    <path
      d="M7 35Q9 24 5 14M7 35Q12 26 14 17M15 35Q16 22 12 10M15 35Q21 25 23 15M25 35Q26 22 23 12M25 35Q31 26 34 18M33 35Q35 26 32 20"
      className="stroke-tinta-suave"
      strokeWidth="2.6"
      fill="none"
      strokeLinecap="round"
    />
  ),
  cacto: (
    <>
      <path d="M20 36V8" className="stroke-tinta" strokeWidth="8" strokeLinecap="round" />
      <path d="M20 26H11V16M20 21H29V12" className="stroke-tinta" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M20 12V30" className="stroke-superficie" strokeWidth="1.2" />
    </>
  ),
  piso: (
    <>
      <rect width="40" height="40" className="fill-tinta" opacity=".07" />
      <path d="M0 20H40M20 0V20M10 20V40M30 20V40M10 0V0" className="stroke-tinta-suave" strokeWidth="1.4" fill="none" />
    </>
  ),
  madeira: (
    <>
      <rect width="40" height="40" className="fill-tinta" opacity=".06" />
      <path d="M0 8H40M0 16H40M0 24H40M0 32H40M12 0V8M28 8V16M8 16V24M24 24V32M16 32V40" className="stroke-tinta-suave" strokeWidth="1.4" fill="none" />
    </>
  ),
  grama: <path d="M8 16L10 10L12 16M27 32L29 26L31 32M30 12L32 6L34 12" className="stroke-tinta-suave" strokeWidth="1.6" opacity=".75" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  areia: (
    <>
      <rect width="40" height="40" className="fill-tinta" opacity=".05" />
      <circle cx="8" cy="9" r="1.5" className="fill-tinta-suave" />
      <circle cx="26" cy="14" r="1.5" className="fill-tinta-suave" />
      <circle cx="15" cy="27" r="1.5" className="fill-tinta-suave" />
      <circle cx="33" cy="31" r="1.5" className="fill-tinta-suave" />
      <circle cx="6" cy="34" r="1.5" className="fill-tinta-suave" />
      <path d="M3 22Q10 18 17 22M22 36Q29 32 36 36" className="stroke-tinta-suave" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  ),
  bau: (
    <>
      <rect x="5" y="17" width="30" height="18" className="fill-superficie stroke-tinta" strokeWidth="2.6" />
      <path d="M5 17Q20 3 35 17Z" className="fill-tinta stroke-tinta" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M13 17V35M27 17V35" className="stroke-tinta" strokeWidth="2" />
      <rect x="17.5" y="20" width="5" height="6" className="fill-tinta" />
    </>
  ),
  mesa: (
    <>
      <rect x="4" y="9" width="32" height="22" className="fill-tinta-suave stroke-tinta" strokeWidth="2.6" />
      <circle cx="14" cy="20" r="3.4" className="fill-superficie stroke-tinta" strokeWidth="1.6" />
      <circle cx="27" cy="20" r="3.4" className="fill-superficie stroke-tinta" strokeWidth="1.6" />
    </>
  ),
  fogueira: (
    <>
      <path d="M7 33L31 25M9 25L33 33" className="stroke-tinta" strokeWidth="4.4" strokeLinecap="round" />
      <path d="M20 5Q29 15 25 23Q20 28 15 23Q11 15 20 5Z" className="fill-vermelho stroke-tinta" strokeWidth="2" strokeLinejoin="round" />
      <path d="M20 15Q23 20 20 24Q17 20 20 15Z" className="fill-superficie" />
    </>
  ),
  altar: (
    <>
      <rect x="3" y="29" width="34" height="6" className="fill-tinta" />
      <rect x="6" y="11" width="28" height="18" className="fill-tinta-suave stroke-tinta" strokeWidth="2.6" />
      <path d="M20 14V27M14 20H26" className="stroke-superficie" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  armadilha: (
    <>
      <rect x="4" y="4" width="32" height="32" className="fill-none stroke-tinta" strokeWidth="2" strokeDasharray="4 3" />
      <path d="M6 31L10 15L14 31Z M16 31L20 15L24 31Z M26 31L30 15L34 31Z" className="fill-vermelho stroke-tinta" strokeWidth="1.6" strokeLinejoin="round" />
    </>
  ),
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
