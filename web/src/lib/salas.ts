import { lerHistorico, type Rolagem } from './dados'
import { CHAVE_ARQUIVO, CHAVE_CONEXAO, CHAVE_JOGADORES, CHAVE_LOG, CHAVE_NOTAS, CHAVE_REDE_MESTRE, CHAVE_SALA, CHAVES_SALA_REMOTA } from './rede/chaves'
import { lerJogadores, type Jogador } from './rede/protocolo'
import { lerSala, type Sala } from './sala'

// Várias salas por navegador. A que está aberta fica nas chaves de sempre (`rpg:sala`, `rpg:sala:log`…), que a
// tela da Sala lê e grava. As outras ficam guardadas juntas em `rpg:salas:arquivo`. Trocar de sala guarda a aberta
// no arquivo e traz a outra para o lugar dela: nada se perde. Tudo aqui é puro: recebe o armazenamento por parâmetro.

export interface Armazem {
  getItem(chave: string): string | null
  setItem(chave: string, valor: string): void
  removeItem(chave: string): void
}

/** Tudo o que faz parte de uma sala neste navegador. */
export interface Guardada {
  sala: Sala
  log: Rolagem[]
  jogadores: Jogador[]
  notas: string
}

/** Uma sala daqui, para a lista. */
export interface SalaLocal {
  id: string
  nome: string
  /** É a sala aberta agora (a que a tela Sala mostra). */
  aberta: boolean
  jogadores: number
  pecas: number
  rodada: number | null
}

function lerJson(arm: Armazem, chave: string): unknown {
  try {
    const bruto = arm.getItem(chave)
    return bruto === null ? null : JSON.parse(bruto)
  } catch {
    return null
  }
}

const gravar = (arm: Armazem, chave: string, valor: unknown) => arm.setItem(chave, JSON.stringify(valor))

export function lerGuardada(v: unknown): Guardada | null {
  if (typeof v !== 'object' || v === null) return null
  const g = v as Record<string, unknown>
  const sala = lerSala(g.sala)
  if (!sala) return null
  return {
    sala,
    log: lerHistorico(g.log) ?? [],
    jogadores: lerJogadores(g.jogadores),
    notas: typeof g.notas === 'string' ? g.notas.slice(0, 20000) : '',
  }
}

/** A sala aberta agora, ou null se não há nenhuma. */
export function lerAberta(arm: Armazem): Guardada | null {
  const sala = lerSala(lerJson(arm, CHAVE_SALA))
  if (!sala) return null
  const notas = lerJson(arm, CHAVE_NOTAS)
  return {
    sala,
    log: lerHistorico(lerJson(arm, CHAVE_LOG)) ?? [],
    jogadores: lerJogadores(lerJson(arm, CHAVE_JOGADORES)),
    notas: typeof notas === 'string' ? notas : '',
  }
}

export function lerArquivo(arm: Armazem): Record<string, Guardada> {
  const bruto = lerJson(arm, CHAVE_ARQUIVO)
  const arquivo: Record<string, Guardada> = {}
  if (typeof bruto !== 'object' || bruto === null) return arquivo
  for (const [id, v] of Object.entries(bruto)) {
    const g = lerGuardada(v)
    if (g && g.sala.id === id) arquivo[id] = g
  }
  return arquivo
}

function gravarArquivo(arm: Armazem, arquivo: Record<string, Guardada>) {
  if (Object.keys(arquivo).length) gravar(arm, CHAVE_ARQUIVO, arquivo)
  else arm.removeItem(CHAVE_ARQUIVO)
}

const resumo = (g: Guardada, aberta: boolean): SalaLocal => ({
  id: g.sala.id,
  nome: g.sala.nome,
  aberta,
  jogadores: g.jogadores.length,
  pecas: g.sala.pecas.length,
  rodada: g.sala.combate?.rodada ?? null,
})

/** As salas deste navegador: a aberta primeiro, depois as guardadas. */
export function salasLocais(arm: Armazem): SalaLocal[] {
  const aberta = lerAberta(arm)
  const guardadas = Object.values(lerArquivo(arm)).filter((g) => g.sala.id !== aberta?.sala.id)
  return [...(aberta ? [resumo(aberta, true)] : []), ...guardadas.map((g) => resumo(g, false))]
}

export function lerSalaLocal(arm: Armazem, id: string): Guardada | null {
  const aberta = lerAberta(arm)
  return aberta?.sala.id === id ? aberta : (lerArquivo(arm)[id] ?? null)
}

function guardarAAberta(arm: Armazem) {
  const aberta = lerAberta(arm)
  if (!aberta) return
  gravarArquivo(arm, { ...lerArquivo(arm), [aberta.sala.id]: aberta })
}

/**
 * Abre uma sala neste navegador. A que estava aberta vai para o arquivo. Sai da sala em rede em que se jogava
 * (quem conduz não está jogando em outra). `noServidor` liga o compartilhamento do mestre.
 */
export function abrirSala(arm: Armazem, g: Guardada, noServidor: boolean): void {
  const aberta = lerAberta(arm)
  if (aberta && aberta.sala.id !== g.sala.id) guardarAAberta(arm)
  const { [g.sala.id]: _saiu, ...resto } = lerArquivo(arm)
  gravarArquivo(arm, resto)
  gravar(arm, CHAVE_SALA, g.sala)
  gravar(arm, CHAVE_LOG, g.log)
  gravar(arm, CHAVE_JOGADORES, g.jogadores)
  gravar(arm, CHAVE_NOTAS, g.notas)
  gravar(arm, CHAVE_REDE_MESTRE, noServidor)
  arm.removeItem(CHAVE_CONEXAO)
  for (const chave of CHAVES_SALA_REMOTA) arm.removeItem(chave)
}

/** Uma sala nova e vazia, aberta no lugar da atual (que fica guardada). */
export function abrirSalaNova(arm: Armazem, sala: Sala): void {
  abrirSala(arm, { sala, log: [], jogadores: [], notas: '' }, false)
}

/** Apaga uma sala guardada (não a aberta: essa se apaga dentro da tela Sala). */
export function apagarGuardada(arm: Armazem, id: string): void {
  const { [id]: _apagada, ...resto } = lerArquivo(arm)
  gravarArquivo(arm, resto)
}
