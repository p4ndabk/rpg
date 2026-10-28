import { useEffect, useState } from 'react'

// Rotas pelo hash (#/inicio, #/dados, #/sala, #/perfil): funciona em qualquer hospedagem estática, sem servidor.

export type Rota = 'inicio' | 'dados' | 'sala' | 'perfil' | 'entrar' | 'salas' | 'amigos'

/** Telas da barra de navegação. O perfil fica no selo do usuário, no cabeçalho. */
export const ROTAS: { rota: Rota; rotulo: string }[] = [
  { rota: 'inicio', rotulo: 'Início' },
  { rota: 'dados', rotulo: 'Dados' },
  { rota: 'salas', rotulo: 'Salas' },
  { rota: 'amigos', rotulo: 'Amigos' },
  { rota: 'sala', rotulo: 'Sala' },
]

export const TITULOS: Record<Rota, string> = { inicio: 'Início', dados: 'Dados', salas: 'Salas', amigos: 'Amigos', sala: 'Sala', perfil: 'Perfil', entrar: 'Entrar na sala' }

export const linkPara = (rota: Rota) => `#/${rota}`

function lerRota(): Rota {
  // #/entrar/<convite> abre a tela de entrar numa sala em rede.
  if (location.hash.startsWith('#/entrar/')) return 'entrar'
  // #/amigos/<npub>?nome=… abre a tela de amigos com a pessoa já preenchida.
  if (location.hash.startsWith('#/amigos/')) return 'amigos'
  const achada = [...ROTAS.map((r) => r.rota), 'perfil' as const].find((r) => location.hash === linkPara(r))
  return achada ?? 'inicio'
}

export function usarRota(): Rota {
  const [rota, setRota] = useState(lerRota)
  useEffect(() => {
    const aoMudar = () => setRota(lerRota())
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])
  return rota
}
