// Ícones de traço, em currentColor, no mesmo peso dos ícones de dado. Decorativos.

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
  'aria-hidden': true,
}

export function IconeCasa({ className = 'size-6' }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M3 11 12 3l9 8" />
      <path d="M5 10v10h5v-6h4v6h5V10" />
    </svg>
  )
}

export function IconeGrid({ className = 'size-6' }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="18" height="18" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </svg>
  )
}

export function IconeLista({ className = 'size-6' }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" strokeWidth={3} />
    </svg>
  )
}

/** Selo de conquista: estrela dentro de um quadrado, como carimbo de folheto. */
export function IconeSelo({ className = 'size-6', cheio = true }: { className?: string; cheio?: boolean }) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="2.5" width="19" height="19" />
      <path
        d="M12 5.5l1.9 4 4.3.4-3.3 2.9 1 4.2L12 14.8 8.1 17l1-4.2-3.3-2.9 4.3-.4z"
        fill={cheio ? 'currentColor' : 'none'}
      />
    </svg>
  )
}

/** Seta em volta: repetir uma rolagem. */
export function IconeRepetir({ className = 'size-5' }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v5h-5" />
    </svg>
  )
}

export function IconeCheck({ className = 'size-5' }: { className?: string }) {
  return (
    <svg {...base} strokeWidth={3} className={className}>
      <path d="M4 12.5 9.5 18 20 6.5" />
    </svg>
  )
}

/** Duas pessoas lado a lado: a lista de amigos. */
export function IconeAmigos({ className = 'size-6' }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.4c2 .7 3.5 2.4 3.5 5.6" />
    </svg>
  )
}

/** Olho riscado: o que está escondido de quem joga. */
export function IconeEscondido({ className = 'size-4' }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M2 12C4.5 7.5 8 5.5 12 5.5s7.5 2 10 6.5c-2.5 4.5-6 6.5-10 6.5S4.5 16.5 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M3 3l18 18" strokeWidth={2.6} />
    </svg>
  )
}

/** Mão aberta: mover peças e o mapa. */
export function IconeMao({ className = 'size-5' }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M8 13V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 6-6 6-2.5 0-4-1-5.5-3.5L3.5 13a1.5 1.5 0 0 1 2.5-1.5L8 14" />
    </svg>
  )
}

/** Pincel: pintar o cenário. */
export function IconePincel({ className = 'size-5' }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M20 4 10 14" />
      <path d="M10 14c-3 0-5 1.5-5 4.5 0 .8-.4 1.5-1.5 1.5 1 .8 2.3 1 3.5 1 3 0 5-2 5-5" />
    </svg>
  )
}

/** Alvo: destacar casas para a mesa toda. */
export function IconeAlvo({ className = 'size-5' }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
    </svg>
  )
}

/** Seta que volta: desfazer. */
export function IconeDesfazer({ className = 'size-5' }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M9 7 4 12l5 5" />
      <path d="M4 12h10a6 6 0 0 1 0 12" transform="translate(0 -5)" />
    </svg>
  )
}

/** Seta que avança: refazer. */
export function IconeRefazer({ className = 'size-5' }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="m15 7 5 5-5 5" />
      <path d="M20 12H10a6 6 0 0 0 0 12" transform="translate(0 -5)" />
    </svg>
  )
}

/** Três pontos ligados: compartilhar a sala. */
export function IconeCompartilhar({ className = 'size-5' }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="m8.2 10.8 7.6-3.9M8.2 13.2l7.6 3.9" />
    </svg>
  )
}
