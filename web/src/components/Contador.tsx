import { Botao } from './ui/Botao'

interface ContadorProps {
  id: string
  rotulo: string
  valor: number
  min: number
  max: number
  aoMudar: (valor: number) => void
  formatar?: (valor: number) => string
  ajuda?: string
  /** Rótulo à esquerda e botões à direita, numa linha só: para ajustes dentro de um cartão. */
  emLinha?: boolean
  /** Controles mais juntos, para caber dois lado a lado na bandeja da sala. */
  compacto?: boolean
}

/** Número ajustado por botões de menos e mais, sem digitação. */
export function Contador({ id, rotulo, valor, min, max, aoMudar, formatar = String, ajuda, emLinha = false, compacto = false }: ContadorProps) {
  const controles = (
    <div role="group" aria-labelledby={`${id}-rotulo`} className={`flex shrink-0 items-center ${compacto ? 'gap-1' : 'gap-2'} ${emLinha ? '' : 'mt-1'}`}>
      <Botao tamanho="icone" aria-label={`Diminuir ${rotulo}`} disabled={valor <= min} onClick={() => aoMudar(valor - 1)}>
        −
      </Botao>
      <output aria-live="polite" className={`text-center font-display ${compacto ? 'min-w-10 text-xl' : 'min-w-12 text-2xl'}`}>
        {formatar(valor)}
      </output>
      <Botao tamanho="icone" aria-label={`Aumentar ${rotulo}`} disabled={valor >= max} onClick={() => aoMudar(valor + 1)}>
        +
      </Botao>
    </div>
  )
  const textos = (
    <>
      <span id={`${id}-rotulo`} className="font-bold">
        {rotulo}
      </span>
      {ajuda && <p className="text-sm text-tinta-suave">{ajuda}</p>}
    </>
  )

  if (emLinha) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">{textos}</div>
        {controles}
      </div>
    )
  }
  return (
    <div>
      <span id={`${id}-rotulo`} className={`font-bold ${compacto ? 'text-sm' : ''}`}>
        {rotulo}
      </span>
      {controles}
      {ajuda && <p className="mt-1 text-sm text-tinta-suave">{ajuda}</p>}
    </div>
  )
}
