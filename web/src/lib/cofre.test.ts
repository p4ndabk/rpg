import { describe, expect, it } from 'vitest'
import { abrir, chaveDoCofre, trancar } from './cofre'

const PUBKEY = 'a'.repeat(64)
// Poucas voltas: o teste não precisa do custo de verdade.
const chave = (senha: string, pubkey = PUBKEY) => chaveDoCofre(senha, pubkey, 1000)

describe('cofre', () => {
  it('tranca e abre com a mesma senha, inclusive com acento e texto grande', async () => {
    const texto = JSON.stringify({ notas: 'O ladrão está na adega. '.repeat(3000), sala: 'Taverna do Bode' })
    const trancado = await trancar(texto, await chave('senha-do-sertão'))
    expect(trancado).not.toContain('ladrão')
    expect(trancado.length).toBeLessThan(texto.length / 5)
    expect(await abrir(trancado, await chave('senha-do-sertão'))).toBe(texto)
  })

  it('senha errada, ou outra pessoa, não abre', async () => {
    const trancado = await trancar('segredo', await chave('senha-certa'))
    expect(await abrir(trancado, await chave('senha-errada'))).toBeNull()
    expect(await abrir(trancado, await chave('senha-certa', 'b'.repeat(64)))).toBeNull()
  })

  it('conteúdo que não é de um cofre dá null', async () => {
    const k = await chave('senha-certa')
    expect(await abrir('lixo', k)).toBeNull()
    expect(await abrir('{"v":2}', k)).toBeNull()
    expect(await abrir(JSON.stringify({ v: 1, iv: 'AAAA', ct: 'AAAA' }), k)).toBeNull()
  })

  it('cada tranca é diferente (iv novo), mas abre igual', async () => {
    const k = await chave('senha-certa')
    const [a, b] = [await trancar('x', k), await trancar('x', k)]
    expect(a).not.toBe(b)
    expect(await abrir(a, k)).toBe(await abrir(b, k))
  })
})
