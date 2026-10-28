import type { ReactNode } from 'react'

interface OpcaoProps {
  nome: string
  valor: string
  marcada: boolean
  aoMarcar: () => void
  children: ReactNode
  className?: string
}

/** Rádio com cara de botão. A opção marcada fica invertida (tinta sobre papel), como o selo ativo. */
export function Opcao({ nome, valor, marcada, aoMarcar, children, className = '' }: OpcaoProps) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center justify-center rounded-cordel border-2 border-borda bg-superficie px-1 text-center text-sm font-bold text-tinta shadow-carimbo-pequeno has-checked:bg-tinta has-checked:text-fundo has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-vermelho ${className}`}
    >
      <input type="radio" name={nome} value={valor} checked={marcada} onChange={aoMarcar} className="sr-only" />
      {children}
    </label>
  )
}
