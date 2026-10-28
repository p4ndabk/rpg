import { describe, expect, it } from 'vitest'
import { lerDispensadas, passosDoRoteiro, roteiroCompleto } from './roteiro'
import { adicionarPeca, criarSala, iniciarCombate, pintar } from './sala'

const ids = (p: ReturnType<typeof passosDoRoteiro>) => p.filter((x) => x.feito).map((x) => x.id)

describe('roteiro do mestre', () => {
  it('sala nova: nada feito', () => {
    expect(ids(passosDoRoteiro(criarSala('Mesa', 8, 8), 0))).toEqual([])
  })

  it('cada passo se marca sozinho', () => {
    let sala = criarSala('Mesa', 8, 8)
    sala = pintar(sala, [{ coluna: 1, linha: 1 }], 'parede')
    expect(ids(passosDoRoteiro(sala, 0))).toEqual(['mapa'])
    sala = adicionarPeca(sala, 'Goblin', 'monstro')
    expect(ids(passosDoRoteiro(sala, 0))).toEqual(['mapa', 'monstros'])
    expect(ids(passosDoRoteiro(sala, 2))).toEqual(['mapa', 'monstros', 'turma'])
    sala = adicionarPeca(sala, 'Mago', 'personagem')
    sala = iniciarCombate(sala).sala
    const todos = passosDoRoteiro(sala, 1)
    expect(roteiroCompleto(todos)).toBe(true)
  })

  it('personagem sozinho não conta como monstro', () => {
    const sala = adicionarPeca(criarSala('Mesa', 8, 8), 'Mago', 'personagem')
    expect(ids(passosDoRoteiro(sala, 0))).toEqual([])
  })

  it('combate já iniciado antes conta mesmo depois de encerrado', () => {
    expect(ids(passosDoRoteiro(criarSala('Mesa', 8, 8), 0, true))).toEqual(['combate'])
  })

  it('lê a lista de dispensadas e descarta lixo', () => {
    expect(lerDispensadas(['a', 1, 'b'])).toEqual(['a', 'b'])
    expect(lerDispensadas('x')).toBeNull()
  })
})
