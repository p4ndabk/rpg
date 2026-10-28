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
