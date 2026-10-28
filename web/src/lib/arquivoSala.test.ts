import { describe, expect, it } from 'vitest'
import { lerArquivoSala, montarArquivoSala, nomeDoArquivoSala } from './arquivoSala'
import { adicionarPeca, alternarOculta, criarSala } from './sala'
import type { Guardada } from './salas'

const MESTRE = 'a'.repeat(64)
const CHAVE = 'b'.repeat(64)

const guardada = (): Guardada => {
  let sala = criarSala('Taverna do Bode', 8, 6, 'sala-1234567', MESTRE)
  sala = alternarOculta(adicionarPeca(sala, 'Goblin', 'monstro', 'g'), 'g')
  return { sala, log: [], jogadores: [{ pubkey: 'c'.repeat(64), nome: 'Ana' }], notas: 'O ladrão está na adega.' }
}

describe('arquivo de sala', () => {
  it('guarda e devolve a sala inteira: escondidos, notas e a chave dos relays', () => {
    const lido = lerArquivoSala(montarArquivoSala(guardada(), CHAVE))
    expect(lido?.chaveNostr).toBe(CHAVE)
    expect(lido?.guardada.notas).toBe('O ladrão está na adega.')
    expect(lido?.guardada.sala.pecas[0]).toMatchObject({ nome: 'Goblin', oculta: true })
    expect(lido?.guardada.jogadores).toEqual([{ pubkey: 'c'.repeat(64), nome: 'Ana' }])
  })

  it('funciona sem chave, e ignora uma chave malformada', () => {
    expect(lerArquivoSala(montarArquivoSala(guardada(), null))?.chaveNostr).toBeNull()
    const torto = JSON.stringify({ ...JSON.parse(montarArquivoSala(guardada(), CHAVE)), chaveNostr: 'xyz' })
    expect(lerArquivoSala(torto)?.chaveNostr).toBeNull()
  })

  it('recusa o que não é uma sala', () => {
    expect(lerArquivoSala('não é json')).toBeNull()
    expect(lerArquivoSala('{}')).toBeNull()
    expect(lerArquivoSala(JSON.stringify({ tipo: 'rpg-sala', sala: { id: 1 } }))).toBeNull()
    // Uma credencial não pode ser aberta como sala.
    expect(lerArquivoSala(JSON.stringify({ v: 1, tipo: 'rpg-credencial', nsec: 'nsec1x' }))).toBeNull()
  })

  it('leva a senha da sala, quando tem', () => {
    expect(lerArquivoSala(montarArquivoSala(guardada(), CHAVE, 'abre-te'))?.senha).toBe('abre-te')
    expect(lerArquivoSala(montarArquivoSala(guardada(), CHAVE))?.senha).toBeNull()
  })

  it('nunca leva uma nsec', () => {
    expect(montarArquivoSala(guardada(), CHAVE)).not.toContain('nsec')
  })

  it('dá um nome de arquivo limpo', () => {
    expect(nomeDoArquivoSala('Taverna do Bode Manco!')).toBe('rpg-sala-taverna-do-bode-manco.json')
    expect(nomeDoArquivoSala('???')).toBe('rpg-sala-sem-nome.json')
  })
})
