import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Lê os tokens direto do CSS para o teste nunca divergir do que vai para a tela.
const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')
const tokens = new Map<string, { claro: string; escuro: string }>()
for (const [, nome, claro, escuro] of css.matchAll(/--([\w-]+):\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/gi)) {
  tokens.set(nome!, { claro: claro!, escuro: escuro! })
}

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro! + 0.05) / (escuro! + 0.05)
}

// Pares texto/fundo usados na interface.
const PARES: [texto: string, fundo: string][] = [
  ['tinta', 'fundo'],
  ['tinta', 'superficie'],
  ['tinta-suave', 'fundo'],
  ['tinta-suave', 'superficie'],
  ['vermelho', 'fundo'],
  ['vermelho', 'superficie'],
  ['sobre-vermelho', 'vermelho'],
  ['verde', 'fundo'],
  ['verde', 'superficie'],
  ['sobre-verde', 'verde'],
  ['fundo', 'tinta'],
]

describe('contraste AA dos tokens', () => {
  it('encontra todos os tokens no CSS', () => {
    expect(tokens.size).toBe(9)
  })

  for (const tema of ['claro', 'escuro'] as const) {
    for (const [texto, fundo] of PARES) {
      it(`${texto} sobre ${fundo} no tema ${tema} passa de 4,5:1`, () => {
        const razao = contraste(tokens.get(texto)![tema], tokens.get(fundo)![tema])
        expect(razao).toBeGreaterThanOrEqual(4.5)
      })
    }
  }
})
