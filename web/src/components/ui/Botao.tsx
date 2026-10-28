import type { ComponentPropsWithRef } from 'react'

const base =
  'inline-flex items-center justify-center gap-2 rounded-cordel border-2 border-borda ' +
  'font-bold transition-transform select-none ' +
  'enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:shadow-none ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none'

const variantes = {
  principal: 'bg-vermelho text-sobre-vermelho',
  secundario: 'bg-superficie text-tinta',
}

const tamanhos = {
  normal: 'px-5 py-2.5 shadow-carimbo',
  pequeno: 'min-h-11 px-3 shadow-carimbo-pequeno',
  icone: 'min-h-11 min-w-11 text-xl leading-none shadow-carimbo-pequeno',
}

interface BotaoProps extends ComponentPropsWithRef<'button'> {
  variante?: keyof typeof variantes
  tamanho?: keyof typeof tamanhos
}

export function Botao({ variante = 'secundario', tamanho = 'normal', className = '', ...props }: BotaoProps) {
  return (
    <button type="button" className={`${base} ${variantes[variante]} ${tamanhos[tamanho]} ${className}`} {...props} />
  )
}
