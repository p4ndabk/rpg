import { useEffect, useState } from 'react'
import { chaveDaSala } from './protegida'

export interface ChaveDaSala {
  chave: CryptoKey
  /** Estável enquanto a senha for a mesma: serve para refazer a conexão só quando ela muda. */
  id: string
}

/**
 * A chave da sala tirada da senha (leva cerca de meio segundo). Sem senha, `pronta` já é verdadeiro e `chave` é null.
 * Com senha, `pronta` só vira verdadeiro quando a chave existe: quem usa espera, para nunca publicar a sala aberta por engano.
 */
export function usarChaveDaSala(senha: string, salaId: string | undefined): { chave: ChaveDaSala | null; pronta: boolean } {
  const [feita, setFeita] = useState<(ChaveDaSala & { para: string }) | null>(null)
  const para = salaId && senha ? `${salaId}|${senha}` : ''
  useEffect(() => {
    if (!para || !salaId) return
    let valido = true
    void chaveDaSala(senha, salaId).then((chave) => valido && setFeita({ chave, id: senha, para }))
    return () => {
      valido = false
    }
  }, [para, senha, salaId])
  if (!para) return { chave: null, pronta: true }
  return feita?.para === para ? { chave: feita, pronta: true } : { chave: null, pronta: false }
}
