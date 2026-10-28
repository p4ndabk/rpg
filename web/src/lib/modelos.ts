import { casasDaForma, criarSala, pintar, tamanhoMinimo, terrenoEm, type Casa, type CasaDeCenario, type Sala, type Terreno } from './sala'

// Modelos de mapa recomendados: um tamanho que combina com o tipo de cena e um cenário já montado (piso, paredes,
// portas, objetos). O mestre começa por um deles e ajusta; nada aqui é obrigatório. Tudo é puro e determinístico:
// o mesmo modelo sempre sai igual (o "sorteio" das árvores usa semente fixa).

export interface Modelo {
  id: string
  nome: string
  /** Uma linha para a lista: o que é. */
  descricao: string
  /** Quando vale a pena usar. */
  dica: string
  colunas: number
  linhas: number
  /** Monta o cenário (sem peças). */
  montar: () => Sala
}

type Passo = [terreno: Terreno | null, casas: Casa[]]

const casa = (coluna: number, linha: number): Casa => ({ coluna, linha })
const retangulo = (c0: number, l0: number, c1: number, l1: number) => casasDaForma('retangulo', casa(c0, l0), casa(c1, l1))
const contorno = (c0: number, l0: number, c1: number, l1: number) => casasDaForma('contorno', casa(c0, l0), casa(c1, l1))
const linha = (c0: number, l0: number, c1: number, l1: number) => casasDaForma('linha', casa(c0, l0), casa(c1, l1))
const pontos = (...p: [number, number][]): Casa[] => p.map(([c, l]) => casa(c, l))

/** Sorteio com semente fixa (LCG): o mesmo modelo sai igual em qualquer navegador. */
function sorteio(semente: number): () => number {
  let x = semente >>> 0
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0
    return x / 2 ** 32
  }
}

function aplicar(sala: Sala, passos: Passo[]): Sala {
  return passos.reduce((s, [terreno, casas]) => pintar(s, casas, terreno), sala)
}

/** Espalha `quantidade` casas de `terreno` só por cima de `sobre` (árvores na grama, cactos na areia). */
function espalhar(sala: Sala, terreno: Terreno, quantidade: number, semente: number, sobre: Terreno): Sala {
  const sorte = sorteio(semente)
  const achadas: Casa[] = []
  for (let tentativa = 0; tentativa < quantidade * 8 && achadas.length < quantidade; tentativa++) {
    const c = casa(Math.floor(sorte() * sala.colunas), Math.floor(sorte() * sala.linhas))
    if (terrenoEm(sala, c.coluna, c.linha) === sobre) achadas.push(c)
  }
  return pintar(sala, achadas, terreno)
}

/** Uma casa de moradia: paredes, piso de madeira por dentro e porta. */
function moradia(c0: number, l0: number, c1: number, l1: number, porta: [number, number]): Passo[] {
  return [
    ['madeira', retangulo(c0, l0, c1, l1)],
    ['parede', contorno(c0, l0, c1, l1)],
    ['porta', pontos(porta)],
  ]
}

const vazio = (): Sala => criarSala('Combate rápido', 12, 8, 'modelo')

function taverna(): Sala {
  return aplicar(criarSala('Taverna', 18, 12, 'modelo'), [
    ['madeira', retangulo(0, 0, 17, 11)],
    ['parede', contorno(0, 0, 17, 11)],
    ['porta', pontos([8, 11], [9, 11])],
    ['mesa', linha(2, 2, 8, 2)],
    ['fogueira', pontos([15, 5])],
    ['mesa', pontos([3, 6], [4, 6], [8, 6], [9, 6], [13, 8], [14, 8], [3, 9], [4, 9])],
    ['escada', pontos([16, 1], [16, 2])],
    ['bau', pontos([1, 1], [15, 10])],
  ])
}

function masmorra(): Sala {
  return aplicar(criarSala('Masmorra', 24, 18, 'modelo'), [
    ['piso', retangulo(0, 0, 23, 17)],
    ['parede', contorno(0, 0, 23, 17)],
    ['parede', linha(8, 1, 8, 16)],
    ['parede', linha(16, 1, 16, 16)],
    ['parede', linha(17, 9, 22, 9)],
    ['porta', pontos([0, 8], [8, 5], [8, 12], [16, 8], [19, 9])],
    ['coluna', pontos([3, 3], [5, 3], [3, 6], [5, 6], [10, 4], [14, 4], [10, 12], [14, 12])],
    ['armadilha', pontos([4, 12], [5, 12], [12, 6])],
    ['altar', pontos([12, 8])],
    ['buraco', pontos([12, 15])],
    ['grade', linha(18, 4, 21, 4)],
    ['bau', pontos([1, 15], [22, 1])],
    ['escada', pontos([22, 16])],
  ])
}

function floresta(): Sala {
  const colunaDoRio = (l: number) => 20 + Math.round(Math.sin(l / 3) * 1.5)
  const rio: Casa[] = Array.from({ length: 22 }, (_, l) => [casa(colunaDoRio(l), l), casa(colunaDoRio(l) + 1, l)]).flat()
  let sala = aplicar(criarSala('Floresta', 30, 22, 'modelo'), [['grama', retangulo(0, 0, 29, 21)]])
  sala = espalhar(sala, 'mato', 45, 11, 'grama')
  sala = espalhar(sala, 'pedra', 14, 12, 'grama')
  sala = espalhar(sala, 'arvore', 95, 13, 'grama')
  return aplicar(sala, [
    ['grama', retangulo(10, 7, 16, 13)],
    ['areia', linha(0, 10, 29, 10)],
    ['fogueira', pontos([13, 10])],
    ['agua', rio],
    ['ponte', pontos([colunaDoRio(10), 10], [colunaDoRio(10) + 1, 10])],
  ])
}

function sertao(): Sala {
  let sala = aplicar(criarSala('Sertão', 28, 20, 'modelo'), [['areia', retangulo(0, 0, 27, 19)]])
  sala = espalhar(sala, 'mato', 22, 21, 'areia')
  sala = espalhar(sala, 'cacto', 26, 22, 'areia')
  sala = espalhar(sala, 'pedra', 18, 23, 'areia')
  return aplicar(sala, [
    ['piso', linha(0, 16, 27, 4)],
    ['agua', retangulo(20, 13, 22, 15)],
    ['mato', contorno(19, 12, 23, 16)],
    ['piso', retangulo(5, 3, 10, 7)],
    ['parede', contorno(5, 3, 10, 7)],
    ['porta', pontos([7, 7])],
    ['fogueira', pontos([14, 10])],
    ['bau', pontos([8, 5])],
  ])
}

function cripta(): Sala {
  return aplicar(criarSala('Cripta', 20, 20, 'modelo'), [
    ['piso', retangulo(0, 0, 19, 19)],
    ['parede', contorno(0, 0, 19, 19)],
    ['porta', pontos([9, 19], [10, 19])],
    ['escada', pontos([9, 1], [10, 1])],
    ['coluna', [4, 8, 12, 16].flatMap((l) => pontos([4, l], [15, l]))],
    ['altar', retangulo(9, 9, 10, 10)],
    ['armadilha', pontos([9, 6], [10, 6], [9, 13], [10, 13])],
    ['grade', [...linha(1, 6, 3, 6), ...linha(16, 6, 18, 6), ...linha(1, 13, 3, 13), ...linha(16, 13, 18, 13)]],
    ['buraco', pontos([9, 3])],
    ['bau', pontos([1, 1], [18, 1], [1, 18], [18, 18])],
  ])
}

function vila(): Sala {
  let sala = aplicar(criarSala('Vila', 40, 30, 'modelo'), [
    ['grama', retangulo(0, 0, 39, 29)],
    ['piso', retangulo(0, 14, 39, 15)],
    ['piso', retangulo(19, 0, 20, 29)],
    ['piso', retangulo(17, 12, 22, 17)],
    ['agua', retangulo(19, 14, 20, 15)],
    ...moradia(3, 3, 9, 8, [6, 8]),
    ...moradia(27, 3, 34, 9, [30, 9]),
    ...moradia(13, 3, 16, 7, [14, 7]),
    ...moradia(3, 20, 10, 26, [6, 20]),
    ...moradia(28, 21, 35, 27, [31, 21]),
    ['cerca', contorno(23, 19, 26, 24)],
    ['porta', pontos([24, 19])],
  ])
  sala = espalhar(sala, 'arvore', 70, 31, 'grama')
  return espalhar(sala, 'mato', 40, 32, 'grama')
}

function castelo(): Sala {
  let sala = aplicar(criarSala('Castelo', 50, 40, 'modelo'), [
    ['grama', retangulo(0, 0, 49, 39)],
    ['agua', contorno(4, 4, 45, 35)],
    ['agua', contorno(5, 5, 44, 34)],
    ['piso', retangulo(24, 33, 25, 39)],
    ['ponte', retangulo(24, 34, 25, 35)],
    ['piso', retangulo(8, 8, 41, 31)],
    ['parede', contorno(7, 7, 42, 32)],
    ['porta', pontos([24, 32], [25, 32])],
    ['pedra', [...retangulo(7, 7, 8, 8), ...retangulo(41, 7, 42, 8), ...retangulo(7, 31, 8, 32), ...retangulo(41, 31, 42, 32)]],
    ['madeira', retangulo(20, 12, 29, 19)],
    ['parede', contorno(20, 12, 29, 19)],
    ['porta', pontos([24, 19], [25, 19])],
    ['mesa', linha(22, 15, 27, 15)],
    ['altar', pontos([24, 13], [25, 13])],
    ['fogueira', pontos([15, 25], [34, 25])],
    ['bau', pontos([21, 13], [28, 13], [10, 10], [39, 10])],
    ['coluna', [...linha(12, 22, 12, 30), ...linha(37, 22, 37, 30)]],
  ])
  sala = espalhar(sala, 'arvore', 90, 41, 'grama')
  return espalhar(sala, 'pedra', 20, 42, 'grama')
}

export const MODELOS: Modelo[] = [
  { id: 'vazio', nome: 'Combate rápido', descricao: 'Tabuleiro limpo, 12 × 8.', dica: 'Uma briga só, sem cenário. Monte o que quiser no modo Cenário.', colunas: 12, linhas: 8, montar: vazio },
  { id: 'taverna', nome: 'Taverna', descricao: 'Salão de madeira com balcão, mesas e lareira.', dica: 'Briga de bar, conversa e informação. Cabe uma mesa de 4 a 6.', colunas: 18, linhas: 12, montar: taverna },
  { id: 'masmorra', nome: 'Masmorra', descricao: 'Três salas ligadas por portas, com armadilhas e baú.', dica: 'Exploração de salas e corredores. Dá para jogar uma sessão inteira.', colunas: 24, linhas: 18, montar: masmorra },
  { id: 'cripta', nome: 'Cripta', descricao: 'Salão de colunas com altar, armadilhas e nichos.', dica: 'Chefe final ou encontro difícil num lugar só.', colunas: 20, linhas: 20, montar: cripta },
  { id: 'floresta', nome: 'Floresta', descricao: 'Mata fechada com clareira, trilha e um rio com ponte.', dica: 'Emboscada e travessia. O mapa pede para andar.', colunas: 30, linhas: 22, montar: floresta },
  { id: 'sertao', nome: 'Sertão', descricao: 'Caatinga de cacto e pedra, ruína, poço e vereda.', dica: 'Viagem e encontro no caminho, com sabor de cordel.', colunas: 28, linhas: 20, montar: sertao },
  { id: 'vila', nome: 'Vila', descricao: 'Casas, praça com fonte, estradas e mato em volta.', dica: 'Mapa grande para andar: investigação e vários encontros.', colunas: 40, linhas: 30, montar: vila },
  { id: 'castelo', nome: 'Castelo', descricao: 'Muralha com torres, fosso, ponte e um salão no meio.', dica: 'Mapa enorme para cerco e invasão. Use o zoom para se localizar.', colunas: 50, linhas: 40, montar: castelo },
]

/** Tamanhos de partida para quem quer só o grid, com a ideia de quando usar cada um. */
export const TAMANHOS: { nome: string; colunas: number; linhas: number; dica: string }[] = [
  { nome: 'Pequeno', colunas: 12, linhas: 8, dica: 'Uma briga rápida' },
  { nome: 'Médio', colunas: 20, linhas: 15, dica: 'Uma sala ou um encontro' },
  { nome: 'Grande', colunas: 30, linhas: 24, dica: 'Vários encontros no mesmo mapa' },
  { nome: 'Enorme', colunas: 50, linhas: 40, dica: 'Cidade, castelo ou travessia' },
]

export const modeloPorId = (id: string): Modelo | undefined => MODELOS.find((m) => m.id === id)

const memoria = new Map<string, CasaDeCenario[]>()

/** O cenário pronto de um modelo (montado uma vez e guardado). */
export function cenarioDoModelo(modelo: Modelo): CasaDeCenario[] {
  let c = memoria.get(modelo.id)
  if (!c) {
    c = modelo.montar().cenario ?? []
    memoria.set(modelo.id, c)
  }
  return c
}

/** Uma sala nova a partir de um modelo. */
export function salaDoModelo(modelo: Modelo, nome: string, id: string = crypto.randomUUID(), mestre?: string): Sala {
  const base = criarSala(nome.trim() || modelo.nome, modelo.colunas, modelo.linhas, id, mestre)
  const cenario = cenarioDoModelo(modelo)
  return cenario.length ? { ...base, cenario: cenario.map((c) => ({ ...c })) } : base
}

/**
 * Troca o cenário de uma sala pelo do modelo e ajusta o tamanho (nunca menor do que as peças pedem). Peça que já está
 * no tabuleiro nunca fica dentro de uma parede: o terreno que barra e cai em cima de uma peça é descartado.
 */
export function aplicarModelo(sala: Sala, modelo: Modelo): Sala {
  const minimo = tamanhoMinimo(sala)
  const colunas = Math.max(modelo.colunas, minimo.colunas)
  const linhas = Math.max(modelo.linhas, minimo.linhas)
  const { cenario: _antigo, ...resto } = sala
  const vazia: Sala = { ...resto, colunas, linhas }
  const dentro = cenarioDoModelo(modelo)
  return pintarCenario(vazia, dentro)
}

/** Pinta um cenário inteiro, agrupando por terreno (o `pintar` já respeita as peças). */
function pintarCenario(sala: Sala, cenario: CasaDeCenario[]): Sala {
  const porTerreno = new Map<Terreno, Casa[]>()
  for (const c of cenario) porTerreno.set(c.terreno, [...(porTerreno.get(c.terreno) ?? []), casa(c.coluna, c.linha)])
  return [...porTerreno].reduce((s, [t, casas]) => pintar(s, casas, t), sala)
}
