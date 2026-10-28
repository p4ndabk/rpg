import { beforeEach, describe, expect, it } from 'vitest'
import { PEDIDO_PADRAO, rolar } from './dados'
import { CHAVE_CONEXAO, CHAVE_REDE_MESTRE } from './rede/chaves'
import { abrirSala, abrirSalaNova, apagarGuardada, lerAberta, lerArquivo, lerSalaLocal, salasLocais, type Armazem } from './salas'
import { adicionarPeca, criarSala } from './sala'

class Memoria implements Armazem {
  dados = new Map<string, string>()
  getItem = (k: string) => this.dados.get(k) ?? null
  setItem = (k: string, v: string) => void this.dados.set(k, v)
  removeItem = (k: string) => void this.dados.delete(k)
}

let arm: Memoria
const nova = (id: string, nome: string) => criarSala(nome, 6, 6, id, 'a'.repeat(64))
beforeEach(() => {
  arm = new Memoria()
})

describe('várias salas no navegador', () => {
  it('começa sem nenhuma', () => {
    expect(salasLocais(arm)).toEqual([])
    expect(lerAberta(arm)).toBeNull()
  })

  it('abrir uma sala nova guarda a que estava aberta, com peças, log e notas', () => {
    abrirSalaNova(arm, adicionarPeca(nova('sala-aaaaaaaa', 'Taverna'), 'Goblin', 'monstro', 'g'))
    const r = rolar(PEDIDO_PADRAO)
    arm.setItem('rpg:sala:log', JSON.stringify([r]))
    arm.setItem('rpg:sala:notas', JSON.stringify('o baú é um mímico'))
    abrirSalaNova(arm, nova('sala-bbbbbbbb', 'Cripta'))
    expect(salasLocais(arm).map((s) => [s.nome, s.aberta])).toEqual([['Cripta', true], ['Taverna', false]])
    expect(lerAberta(arm)!.log).toEqual([]) // a sala nova começa limpa
    const guardada = lerArquivo(arm)['sala-aaaaaaaa']!
    expect(guardada.sala.pecas[0]!.nome).toBe('Goblin')
    expect(guardada.log).toEqual([r])
    expect(guardada.notas).toBe('o baú é um mímico')
  })

  it('trocar de volta traz tudo de novo e não perde a outra', () => {
    abrirSalaNova(arm, adicionarPeca(nova('sala-aaaaaaaa', 'Taverna'), 'Goblin', 'monstro', 'g'))
    abrirSalaNova(arm, nova('sala-bbbbbbbb', 'Cripta'))
    abrirSala(arm, lerSalaLocal(arm, 'sala-aaaaaaaa')!, false)
    expect(lerAberta(arm)!.sala.pecas).toHaveLength(1)
    expect(salasLocais(arm).map((s) => [s.nome, s.aberta])).toEqual([['Taverna', true], ['Cripta', false]])
    expect(Object.keys(lerArquivo(arm))).toEqual(['sala-bbbbbbbb'])
  })

  it('abrir a que já está aberta não duplica', () => {
    abrirSalaNova(arm, nova('sala-aaaaaaaa', 'Taverna'))
    abrirSala(arm, lerAberta(arm)!, false)
    expect(salasLocais(arm)).toHaveLength(1)
    expect(lerArquivo(arm)).toEqual({})
  })

  it('abrir uma sala liga ou desliga o compartilhamento e tira quem joga em outra sala', () => {
    arm.setItem(CHAVE_CONEXAO, JSON.stringify({ salaId: 'sala-zzzzzzzz' }))
    abrirSala(arm, { sala: nova('sala-aaaaaaaa', 'Taverna'), log: [], jogadores: [], notas: '' }, true)
    expect(arm.getItem(CHAVE_REDE_MESTRE)).toBe('true')
    expect(arm.getItem(CHAVE_CONEXAO)).toBeNull()
    abrirSalaNova(arm, nova('sala-bbbbbbbb', 'Cripta'))
    expect(arm.getItem(CHAVE_REDE_MESTRE)).toBe('false')
  })

  it('apaga só a guardada', () => {
    abrirSalaNova(arm, nova('sala-aaaaaaaa', 'Taverna'))
    abrirSalaNova(arm, nova('sala-bbbbbbbb', 'Cripta'))
    apagarGuardada(arm, 'sala-aaaaaaaa')
    expect(salasLocais(arm).map((s) => s.nome)).toEqual(['Cripta'])
    expect(arm.getItem('rpg:salas:arquivo')).toBeNull()
  })

  it('descarta no arquivo o que está corrompido ou com id trocado', () => {
    arm.setItem('rpg:salas:arquivo', JSON.stringify({ 'sala-aaaaaaaa': { sala: { ...nova('outro-idxxxxx', 'X') } }, 'sala-bbbbbbbb': 'lixo' }))
    expect(lerArquivo(arm)).toEqual({})
    arm.setItem('rpg:salas:arquivo', '{nao e json')
    expect(lerArquivo(arm)).toEqual({})
  })
})
