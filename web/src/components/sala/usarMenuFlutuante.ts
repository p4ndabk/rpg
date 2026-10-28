import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * O que todo menu de botão direito precisa: ficar no ponto do cursor sem passar da borda da janela e fechar com
 * Esc, clique fora ou redimensionar. Devolve a `raiz` (para pôr no elemento do menu) e o `lugar` (esquerda e topo).
 */
export function usarMenuFlutuante(ponto: { x: number; y: number }, aoFechar: () => void) {
  const raiz = useRef<HTMLDivElement>(null)
  const [lugar, setLugar] = useState({ x: ponto.x, y: ponto.y })

  useLayoutEffect(() => {
    const r = raiz.current?.getBoundingClientRect()
    if (!r) return
    setLugar({
      x: Math.max(8, Math.min(ponto.x, window.innerWidth - r.width - 8)),
      y: Math.max(8, Math.min(ponto.y, window.innerHeight - r.height - 8)),
    })
  }, [ponto])

  useEffect(() => {
    const fora = (e: PointerEvent) => !raiz.current?.contains(e.target as Node) && aoFechar()
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('pointerdown', fora, true)
    window.addEventListener('keydown', tecla)
    window.addEventListener('resize', aoFechar)
    return () => {
      window.removeEventListener('pointerdown', fora, true)
      window.removeEventListener('keydown', tecla)
      window.removeEventListener('resize', aoFechar)
    }
  }, [aoFechar])

  return { raiz, lugar }
}
