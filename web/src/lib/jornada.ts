import type { Rolagem, RolagemTeste } from './dados'
import type { Rota } from './rota'
import type { TipoPeca } from './sala'

// Gamificação: XP, níveis, missões de primeiros passos e selos (conquistas).
// Tudo aqui é puro; o componente só guarda o estado e mostra as novidades.

export type Evento =
  | { tipo: 'rolagem'; rolagem: Rolagem; naSala: boolean }
  | { tipo: 'sala-criada' }
  | { tipo: 'peca-adicionada'; peca: TipoPeca; personagens: number; monstros: number }
  | { tipo: 'peca-movida' }
  | { tipo: 'combate-iniciado' }
  | { tipo: 'nova-rodada'; rodada: number }

export interface Estatisticas {
  rolagens: number
  /** Testes de D20, para a média dos naturais. */
  testes: number
  somaNaturais: number
  vinteNaturais: number
  umNaturais: number
  maiorTotal: number
}

export interface Jornada {
  xp: number
  estatisticas: Estatisticas
  /** id → quando foi cumprida. */
  missoes: Record<string, number>
  /** id → quando foi conquistada. */
  conquistas: Record<string, number>
}

export const JORNADA_INICIAL: Jornada = {
  xp: 0,
  estatisticas: { rolagens: 0, testes: 0, somaNaturais: 0, vinteNaturais: 0, umNaturais: 0, maiorTotal: 0 },
  missoes: {},
  conquistas: {},
}

export const XP = {
  rolagem: 5,
  vinteNatural: 15,
  // Tirar 1 também rende: errar faz parte do jogo e não pode parecer castigo.
  umNatural: 5,
  salaCriada: 20,
  pecaAdicionada: 5,
  pecaMovida: 2,
  combate: 15,
  rodada: 5,
  missao: 25,
  conquista: 30,
} as const

// Níveis

const NIVEIS = [
  { titulo: 'Aprendiz', frase: 'Toda lenda começa com uma rolagem.' },
  { titulo: 'Andarilho', frase: 'Já conhece o caminho das pedras.' },
  { titulo: 'Aventureiro', frase: 'Os dados já sabem seu nome.' },
  { titulo: 'Veterano', frase: 'Cada cicatriz conta uma história.' },
  { titulo: 'Herói', frase: 'Seu nome já corre nos folhetos da feira.' },
  { titulo: 'Campeão', frase: 'Os cantadores rimam seus feitos.' },
  { titulo: 'Lenda', frase: 'Você virou cordel.' },
]

/** XP total para chegar ao nível n: 0, 100, 300, 600, 1000… */
export const xpDoNivel = (n: number) => 50 * n * (n - 1)

export function nivelDe(xp: number): number {
  let n = 1
  while (xpDoNivel(n + 1) <= xp) n++
  return n
}

const dadosDoNivel = (n: number) => NIVEIS[Math.min(n, NIVEIS.length) - 1]!
export const tituloDoNivel = (n: number) => dadosDoNivel(n).titulo

export function progresso(xp: number) {
  const nivel = nivelDe(xp)
  const base = xpDoNivel(nivel)
  const necessario = xpDoNivel(nivel + 1) - base
  return {
    nivel,
    titulo: tituloDoNivel(nivel),
    proximoTitulo: tituloDoNivel(nivel + 1),
    atual: xp - base,
    necessario,
    fracao: (xp - base) / necessario,
  }
}

// Missões: os primeiros passos, que dizem o que fazer a quem não sabe por onde começar.

export interface Missao {
  id: string
  titulo: string
  dica: string
  rota: Rota
  cumprida: (e: Evento) => boolean
}

const testeDe = (e: Evento): RolagemTeste | null =>
  e.tipo === 'rolagem' && e.rolagem.tipo === 'teste' ? e.rolagem : null

export const MISSOES: Missao[] = [
  {
    id: 'primeiro-d20',
    titulo: 'Role seu primeiro D20',
    dica: 'Em Dados, escolha o D20 e toque em Rolar. Passou da CD? Sucesso!',
    rota: 'dados',
    cumprida: (e) => testeDe(e) !== null,
  },
  {
    id: 'primeiro-dano',
    titulo: 'Role um dado de dano',
    dica: 'Escolha um D6 ou um D8, ajuste a quantidade e role.',
    rota: 'dados',
    cumprida: (e) => e.tipo === 'rolagem' && e.rolagem.tipo === 'soma',
  },
  {
    id: 'criar-sala',
    titulo: 'Monte sua sala',
    dica: 'A sala é o tabuleiro da sua aventura. Dê um nome e escolha o tamanho do grid.',
    rota: 'sala',
    cumprida: (e) => e.tipo === 'sala-criada',
  },
  {
    id: 'personagem',
    titulo: 'Coloque um herói no grid',
    dica: 'Toque num atalho de personagem, como Guerreira ou Mago.',
    rota: 'sala',
    cumprida: (e) => e.tipo === 'peca-adicionada' && e.peca === 'personagem',
  },
  {
    id: 'monstro',
    titulo: 'Chame um monstro',
    dica: 'Toque num atalho de monstro, como Goblin ou Lobo.',
    rota: 'sala',
    cumprida: (e) => e.tipo === 'peca-adicionada' && e.peca === 'monstro',
  },
  {
    id: 'mover',
    titulo: 'Mova uma peça',
    dica: 'Toque numa peça e depois numa casa vazia.',
    rota: 'sala',
    cumprida: (e) => e.tipo === 'peca-movida',
  },
  {
    id: 'combate',
    titulo: 'Comece um combate',
    dica: 'Com duas peças ou mais, toque em Iniciar combate. A iniciativa decide quem age primeiro.',
    rota: 'sala',
    cumprida: (e) => e.tipo === 'combate-iniciado',
  },
]

export function proximaMissao(j: Jornada): Missao | undefined {
  return MISSOES.find((m) => !j.missoes[m.id])
}

// Selos: conquistas guardadas como carimbos de cordel.

export interface Conquista {
  id: string
  titulo: string
  descricao: string
  alcancada: (j: Jornada, e: Evento) => boolean
}

export const CONQUISTAS: Conquista[] = [
  {
    id: 'primeira-rolagem',
    titulo: 'Os dados estão lançados',
    descricao: 'Faça sua primeira rolagem.',
    alcancada: (j) => j.estatisticas.rolagens >= 1,
  },
  {
    id: 'vinte-natural',
    titulo: 'Vinte natural',
    descricao: 'Tire 20 natural num teste.',
    alcancada: (_, e) => testeDe(e)?.natural === 20,
  },
  {
    id: 'um-natural',
    titulo: 'Faz parte',
    descricao: 'Tire 1 natural. Todo herói tropeça.',
    alcancada: (_, e) => testeDe(e)?.natural === 1,
  },
  {
    id: 'sorte-dobrada',
    titulo: 'Sorte dobrada',
    descricao: 'Tire 20 nos dois dados de uma vantagem.',
    alcancada: (_, e) => {
      const t = testeDe(e)
      return t?.modo === 'vantagem' && t.dados.every((v) => v === 20)
    },
  },
  {
    id: 'contra-as-chances',
    titulo: 'Contra todas as chances',
    descricao: 'Passe num teste de CD 25 ou mais sem tirar 20.',
    alcancada: (_, e) => {
      const t = testeDe(e)
      return t?.desfecho === 'sucesso' && t.cd >= 25
    },
  },
  {
    id: 'golpe-perfeito',
    titulo: 'Golpe perfeito',
    descricao: 'Tire o máximo em todos os dados de uma soma com 2 dados ou mais.',
    alcancada: (_, e) =>
      e.tipo === 'rolagem' &&
      e.rolagem.tipo === 'soma' &&
      e.rolagem.dados.length >= 2 &&
      e.rolagem.dados.every((v) => v === e.rolagem.faces),
  },
  {
    id: 'chuva-de-dados',
    titulo: 'Chuva de dados',
    descricao: 'Role 20 dados de uma vez.',
    alcancada: (_, e) => e.tipo === 'rolagem' && e.rolagem.dados.length >= 20,
  },
  {
    id: 'cem-rolagens',
    titulo: 'Mão quente',
    descricao: 'Faça 100 rolagens.',
    alcancada: (j) => j.estatisticas.rolagens >= 100,
  },
  {
    id: 'anfitriao',
    titulo: 'Dono da mesa',
    descricao: 'Crie sua primeira sala.',
    alcancada: (_, e) => e.tipo === 'sala-criada',
  },
  {
    id: 'grupo',
    titulo: 'Grupo completo',
    descricao: 'Tenha 4 personagens no grid.',
    alcancada: (_, e) => e.tipo === 'peca-adicionada' && e.personagens >= 4,
  },
  {
    id: 'bando',
    titulo: 'Bando',
    descricao: 'Tenha 5 monstros no grid ao mesmo tempo.',
    alcancada: (_, e) => e.tipo === 'peca-adicionada' && e.monstros >= 5,
  },
  {
    id: 'sobrevivente',
    titulo: 'Sobrevivente',
    descricao: 'Chegue à rodada 3 de um combate.',
    alcancada: (_, e) => e.tipo === 'nova-rodada' && e.rodada >= 3,
  },
  {
    id: 'jornada',
    titulo: 'Primeiros passos',
    descricao: 'Cumpra todas as missões do começo.',
    alcancada: (j) => MISSOES.every((m) => j.missoes[m.id]),
  },
]

// Registro

export interface Novidade {
  tipo: 'missao' | 'conquista' | 'nivel'
  titulo: string
  texto: string
  xp?: number
}

function xpDoEvento(e: Evento): number {
  switch (e.tipo) {
    case 'rolagem': {
      const natural = e.rolagem.tipo === 'teste' ? e.rolagem.natural : 0
      return XP.rolagem + (natural === 20 ? XP.vinteNatural : 0) + (natural === 1 ? XP.umNatural : 0)
    }
    case 'sala-criada':
      return XP.salaCriada
    case 'peca-adicionada':
      return XP.pecaAdicionada
    case 'peca-movida':
      return XP.pecaMovida
    case 'combate-iniciado':
      return XP.combate
    case 'nova-rodada':
      return XP.rodada
  }
}

function contar(s: Estatisticas, e: Evento): Estatisticas {
  if (e.tipo !== 'rolagem') return s
  const r = e.rolagem
  const teste = r.tipo === 'teste'
  return {
    rolagens: s.rolagens + 1,
    testes: s.testes + (teste ? 1 : 0),
    somaNaturais: s.somaNaturais + (teste ? r.natural : 0),
    vinteNaturais: s.vinteNaturais + (teste && r.natural === 20 ? 1 : 0),
    umNaturais: s.umNaturais + (teste && r.natural === 1 ? 1 : 0),
    maiorTotal: r.tipo === 'soma' ? Math.max(s.maiorTotal, r.total) : s.maiorTotal,
  }
}

/** Aplica um evento: soma XP, cumpre missões, dá selos e avisa se subiu de nível. */
export function registrarEvento(j: Jornada, e: Evento, agora = Date.now()): { jornada: Jornada; novidades: Novidade[] } {
  const novidades: Novidade[] = []
  const nova: Jornada = {
    xp: j.xp + xpDoEvento(e),
    estatisticas: contar(j.estatisticas, e),
    missoes: { ...j.missoes },
    conquistas: { ...j.conquistas },
  }

  const cumpridas = MISSOES.filter((m) => !nova.missoes[m.id] && m.cumprida(e))
  for (const m of cumpridas) {
    nova.missoes[m.id] = agora
    nova.xp += XP.missao
  }
  const proxima = proximaMissao(nova)
  for (const m of cumpridas) {
    novidades.push({
      tipo: 'missao',
      titulo: m.titulo,
      texto: proxima ? `Próxima missão: ${proxima.titulo}.` : 'Você cumpriu todos os primeiros passos!',
      xp: XP.missao,
    })
  }

  for (const c of CONQUISTAS) {
    if (nova.conquistas[c.id] || !c.alcancada(nova, e)) continue
    nova.conquistas[c.id] = agora
    nova.xp += XP.conquista
    novidades.push({ tipo: 'conquista', titulo: c.titulo, texto: c.descricao, xp: XP.conquista })
  }

  const antes = nivelDe(j.xp)
  const depois = nivelDe(nova.xp)
  if (depois > antes) {
    novidades.push({ tipo: 'nivel', titulo: `Nível ${depois}: ${tituloDoNivel(depois)}`, texto: dadosDoNivel(depois).frase })
  }

  return { jornada: nova, novidades }
}

// Leitura do localStorage: o que estiver errado volta ao início, sem derrubar o resto.

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0)

function lerMarcas(v: unknown, validos: { id: string }[]): Record<string, number> {
  if (!ehObjeto(v)) return {}
  return Object.fromEntries(validos.filter(({ id }) => typeof v[id] === 'number').map(({ id }) => [id, v[id] as number]))
}

export function lerJornada(v: unknown): Jornada | null {
  if (!ehObjeto(v)) return null
  const s = ehObjeto(v.estatisticas) ? v.estatisticas : {}
  return {
    xp: numero(v.xp),
    estatisticas: {
      rolagens: numero(s.rolagens),
      testes: numero(s.testes),
      somaNaturais: numero(s.somaNaturais),
      vinteNaturais: numero(s.vinteNaturais),
      umNaturais: numero(s.umNaturais),
      maiorTotal: numero(s.maiorTotal),
    },
    missoes: lerMarcas(v.missoes, MISSOES),
    conquistas: lerMarcas(v.conquistas, CONQUISTAS),
  }
}
