import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Botao } from '../ui/Botao'

interface GavetaPecasProps {
  aberta: boolean
  aoFechar: () => void
  titulo?: string
  children: ReactNode
}

/**
 * Gaveta lateral com o que tira o tabuleiro do caminho: atalhos e lista de peças.
 * É um `<dialog>` modal: prende o foco, fecha com Escape e devolve o foco a quem abriu.
 */
export function GavetaPecas({ aberta, aoFechar, titulo = 'Peças', children }: GavetaPecasProps) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()
  // O evento "close" chega depois do fim: se a gaveta foi fechada pelo app (a prop já é false), não conta como a pessoa fechar.
  const abertaRef = useRef(aberta)
  abertaRef.current = aberta

  useEffect(() => {
    const d = dialogo.current!
    if (aberta && !d.open) d.showModal()
    if (!aberta && d.open) d.close()
  }, [aberta])

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={idTitulo}
      onClose={() => abertaRef.current && aoFechar()}
      // Tocar no fundo escurecido também fecha.
      onClick={(e) => e.target === e.currentTarget && aoFechar()}
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-md border-0 border-l-2 border-borda bg-superficie p-0 text-tinta shadow-carimbo backdrop:bg-tinta/60 open:animate-entrar"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b-2 border-borda bg-superficie px-5 py-3">
        <h2 id={idTitulo} className="font-display text-2xl">
          {titulo}
        </h2>
        <Botao tamanho="pequeno" onClick={aoFechar}>
          Fechar
        </Botao>
      </div>
      <div className="space-y-8 px-5 py-5">{children}</div>
    </dialog>
  )
}
