import type { Desfecho } from '../../lib/dados'

export const DESFECHOS: Record<Desfecho, { rotulo: string; classe: string; passou: boolean }> = {
  'sucesso-critico': { rotulo: 'Sucesso crítico', classe: 'bg-verde text-sobre-verde', passou: true },
  sucesso: { rotulo: 'Sucesso', classe: 'bg-superficie text-verde', passou: true },
  falha: { rotulo: 'Falha', classe: 'bg-superficie text-vermelho', passou: false },
  'falha-critica': { rotulo: 'Falha crítica', classe: 'bg-vermelho text-sobre-vermelho', passou: false },
}

/** Rótulo do desfecho. O quadrado cheio ou vazio repete a informação sem depender da cor. */
export function Selo({ desfecho }: { desfecho: Desfecho }) {
  const { rotulo, classe, passou } = DESFECHOS[desfecho]
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-cordel border-2 border-borda px-2 py-0.5 text-xs font-bold tracking-wide uppercase ${classe}`}
    >
      <span aria-hidden="true" className={`size-2 border-2 border-current ${passou ? 'bg-current' : ''}`} />
      {rotulo}
    </span>
  )
}
