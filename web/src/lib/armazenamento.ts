import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

// Tudo fica no navegador. O acesso ao localStorage pode falhar (aba anônima,
// cota cheia, bloqueio do navegador), então o app segue só em memória nesses casos.

/** "converter" valida o que foi salvo e, se der, aproveita formatos antigos; null usa o padrão. */
export function ler<T>(chave: string, padrao: T, converter: (v: unknown) => T | null): T {
  try {
    const bruto = localStorage.getItem(chave)
    if (bruto === null) return padrao
    return converter(JSON.parse(bruto)) ?? padrao
  } catch {
    return padrao
  }
}

export function gravar(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    // Sem armazenamento: o valor vale só até fechar a aba.
  }
}

/** Igual ao useState, mas lido e gravado no localStorage. */
export function usarArmazenado<T>(
  chave: string,
  padrao: T,
  converter: (v: unknown) => T | null,
): [T, Dispatch<SetStateAction<T>>] {
  const [valor, setValor] = useState(() => ler(chave, padrao, converter))
  useEffect(() => gravar(chave, valor), [chave, valor])
  return [valor, setValor]
}
