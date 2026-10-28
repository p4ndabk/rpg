import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { usarArmazenado } from '../../lib/armazenamento'
import { lerUsuario, type Usuario } from '../../lib/usuario'

const CHAVE_USUARIO = 'rpg:usuario'

interface ValorUsuario {
  /** Null enquanto ninguém entrou neste navegador. */
  usuario: Usuario | null
  entrar: (usuario: Usuario) => void
  sair: () => void
}

const Contexto = createContext<ValorUsuario | null>(null)

/** Quem está jogando neste navegador. Guarda só o nome e a chave pública; a nsec nunca é salva. */
export function ProvedorUsuario({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = usarArmazenado<Usuario | null>(CHAVE_USUARIO, null, lerUsuario)
  const valor = useMemo(() => ({ usuario, entrar: setUsuario, sair: () => setUsuario(null) }), [usuario, setUsuario])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function usarUsuario(): ValorUsuario {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('usarUsuario precisa estar dentro de ProvedorUsuario')
  return valor
}
