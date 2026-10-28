import { lerHistorico, noHistorico, noMomento, type Rolagem } from '../dados'
import { adicionarPeca, daVez, editarFicha, lerSala, moverPeca, passarVez, pecasVisiveis, removerPeca, type Casa, type Sala } from '../sala'

// Sala em rede. O SERVIDOR (Node) guarda a sala de verdade e fala com os navegadores por WebSocket. O mestre manda
// o estado completo; quem joga manda AÇÕES ("mover", "rolar"…) e o servidor as confere (`aplicarAcao`) e aplica.
// Cada navegador recebe só o que pode ver: a foto pública não leva peça escondida, vida de monstro, rolagem
// secreta nem notas. Este arquivo é puro e roda igual no navegador e no servidor.

const TAMANHO_MAXIMO_NOME = 40

export interface Jogador {
  pubkey: string
  nome: string
}

export interface Estado {
  sala: Sala
  log: Rolagem[]
  jogadores: Jogador[]
}

export interface Foto {
  v: 1
  sala: Sala
  log: Rolagem[]
  jogadores: Jogador[]
}

/** O que a mesa pode ver da sala: sem peças escondidas, sem a vida dos monstros e sem rolagens secretas. */
export function visaoPublica({ sala, log, jogadores }: Estado): Foto {
  const visiveis = pecasVisiveis(sala, false).map((p) => {
    if (p.tipo !== 'monstro') return p
    // Do monstro, quem joga não vê a vida, a descrição (o mestre pode anotar segredos) nem a CD.
    const { descricao: _d, cd: _c, bonusIniciativa: _b, ...resto } = p
    return { ...resto, pv: 1, pvMax: 1 }
  })
  const ids = new Set(visiveis.map((p) => p.id))
  let combate = sala.combate
  if (combate) {
    const naVez = combate.ordem[combate.vez]
    const ordem = combate.ordem.filter((o) => ids.has(o.id))
    if (ordem.length === 0) combate = null
    else {
      // Se quem está na vez está escondido, a foto aponta o próximo que aparece.
      let indice = ordem.findIndex((o) => o.id === naVez?.id)
      if (indice === -1) {
        const depois = combate.ordem.slice(combate.vez).concat(combate.ordem.slice(0, combate.vez)).find((o) => ids.has(o.id))
        indice = Math.max(0, ordem.findIndex((o) => o.id === depois?.id))
      }
      combate = { ordem, vez: indice, rodada: combate.rodada }
    }
  }
  // A vida base dos monstros é do mestre: não vai na foto de quem joga.
  const { pvBase: _pvBase, ...publica } = sala
  return { v: 1, sala: { ...publica, pecas: visiveis, combate }, log: log.filter((r) => !r.secreta), jogadores }
}

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const ehPubkey = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v)

export function lerJogadores(v: unknown): Jogador[] {
  if (!Array.isArray(v)) return []
  return v.flatMap((j) =>
    ehObjeto(j) && ehPubkey(j.pubkey) ? [{ pubkey: j.pubkey, nome: String(j.nome ?? 'Sem nome').slice(0, TAMANHO_MAXIMO_NOME) }] : [],
  )
}

export function lerFoto(texto: string): Foto | null {
  let v: unknown
  try {
    v = JSON.parse(texto)
  } catch {
    return null
  }
  if (!ehObjeto(v) || v.v !== 1) return null
  const sala = lerSala(v.sala)
  if (!sala) return null
  return { v: 1, sala, log: lerHistorico(v.log) ?? [], jogadores: lerJogadores(v.jogadores) }
}

// ---- Ações de quem joga

export type Acao =
  | { tipo: 'entrar'; nome: string }
  | { tipo: 'colocar'; nome: string; casa?: Casa }
  | { tipo: 'mover'; peca: string; coluna: number; linha: number }
  | { tipo: 'remover'; peca: string }
  | { tipo: 'passar' }
  | { tipo: 'rolar'; rolagem: Rolagem }
  /** Quem joga edita a ficha do próprio personagem. */
  | { tipo: 'ficha'; peca: string; descricao: string; cd: number | null; bonusIniciativa: number }

export function lerAcao(texto: string): Acao | null {
  let v: unknown
  try {
    v = JSON.parse(texto)
  } catch {
    return null
  }
  if (!ehObjeto(v) || v.v !== 1) return null
  switch (v.tipo) {
    case 'entrar':
      return typeof v.nome === 'string' ? { tipo: 'entrar', nome: v.nome } : null
    case 'colocar': {
      if (typeof v.nome !== 'string') return null
      const c = v.casa
      const casa = ehObjeto(c) && Number.isInteger(c.coluna) && Number.isInteger(c.linha) ? { coluna: c.coluna as number, linha: c.linha as number } : undefined
      return { tipo: 'colocar', nome: v.nome, ...(casa ? { casa } : {}) }
    }
    case 'mover':
      return typeof v.peca === 'string' && Number.isInteger(v.coluna) && Number.isInteger(v.linha)
        ? { tipo: 'mover', peca: v.peca, coluna: v.coluna as number, linha: v.linha as number }
        : null
    case 'remover':
      return typeof v.peca === 'string' ? { tipo: 'remover', peca: v.peca } : null
    case 'passar':
      return { tipo: 'passar' }
    case 'ficha':
      return typeof v.peca === 'string' && typeof v.descricao === 'string' && (v.cd === null || Number.isFinite(v.cd)) && Number.isFinite(v.bonusIniciativa)
        ? { tipo: 'ficha', peca: v.peca, descricao: v.descricao, cd: v.cd as number | null, bonusIniciativa: v.bonusIniciativa as number }
        : null
    case 'rolar': {
      const r = lerHistorico([v.rolagem])?.[0]
      return r ? { tipo: 'rolar', rolagem: r } : null
    }
    default:
      return null
  }
}

export const textoDaAcao = (a: Acao): string => JSON.stringify({ v: 1, ...a })

/**
 * O mestre confere uma ação de `autor` e, se valer, devolve o novo estado. Null = recusada (quem joga só
 * mexe na própria peça, na própria vez). Nunca confia no que veio: tudo é relido e checado aqui.
 */
export function aplicarAcao(estado: Estado, acao: Acao, autor: string): Estado | null {
  const { sala, log, jogadores } = estado
  const nome = jogadores.find((j) => j.pubkey === autor)?.nome ?? 'Sem nome'
  const minha = (id: string) => sala.pecas.find((p) => p.id === id && p.dono === autor)
  switch (acao.tipo) {
    case 'entrar': {
      const limpo = acao.nome.trim().slice(0, TAMANHO_MAXIMO_NOME) || 'Sem nome'
      const outros = jogadores.filter((j) => j.pubkey !== autor)
      return { ...estado, jogadores: [...outros, { pubkey: autor, nome: limpo }] }
    }
    case 'colocar': {
      // Uma peça por pessoa, e só personagem: monstro é do mestre.
      if (sala.pecas.some((p) => p.dono === autor)) return null
      const nova = adicionarPeca(sala, acao.nome.slice(0, 30), 'personagem', undefined, acao.casa, undefined, autor)
      return nova === sala ? null : { ...estado, sala: nova }
    }
    case 'mover': {
      if (!minha(acao.peca)) return null
      const nova = moverPeca(sala, acao.peca, acao.coluna, acao.linha)
      return nova === sala ? null : { ...estado, sala: nova }
    }
    case 'remover':
      return minha(acao.peca) ? { ...estado, sala: removerPeca(sala, acao.peca) } : null
    case 'ficha':
      return minha(acao.peca) ? { ...estado, sala: editarFicha(sala, acao.peca, acao) } : null
    case 'passar': {
      const vez = daVez(sala)
      if (!vez || vez.dono !== autor) return null
      return { ...estado, sala: passarVez(sala) }
    }
    case 'rolar': {
      const r = acao.rolagem
      const marcada = noMomento({ ...r, rotulo: r.rotulo.trim() || nome }, { rodada: sala.combate?.rodada })
      // Rolagem de quem joga nunca é secreta nem de iniciativa: isso é do mestre.
      const { secreta: _s, iniciativa: _i, ...limpa } = marcada
      return { ...estado, log: noHistorico(log, limpa as Rolagem) }
    }
  }
}

// ---- Convite e mensagens

const ID_SALA = /^[0-9a-zA-Z-]{8,64}$/

/** O convite é o id da sala, dentro de um link que abre a tela de entrar (#/entrar/<id>). Aceita o link inteiro. */
export function lerConvite(texto: string): string | null {
  const id = texto.trim().replace(/^.*#\/entrar\//, '')
  return ID_SALA.test(id) ? id : null
}

/** O que o servidor sabe de uma sala: o estado completo e a versão (sobe a cada mudança). */
export interface Mesa {
  mestre: string
  versao: number
  estado: Estado
  /** Quando a sala mudou pela última vez (ms desde 1970). Salas antigas do arquivo não têm. */
  atualizadaEm?: number
}

/** Uma sala na lista "Minhas salas". */
export interface ResumoSala {
  id: string
  nome: string
  /** O papel de quem pediu a lista. */
  papel: 'mestre' | 'jogador'
  jogadores: number
  pecas: number
  /** Rodada do combate em andamento, ou null. */
  rodada: number | null
  atualizadaEm: number
}

/** Navegador → servidor. */
export type MensagemCliente =
  | { t: 'entrar'; sala: string; pubkey: string; nome: string }
  /** O mestre cria a sala no servidor (ou volta a ela) mandando o estado que tem. */
  | { t: 'abrir'; sala: string; pubkey: string; nome: string; estado: Estado; versao: number }
  /** O mestre troca o estado. `base` é a versão que ele viu por último; se o servidor já passou dela, há conflito. */
  | { t: 'estado'; base: number; estado: Estado }
  | { t: 'acao'; acao: Acao }
  /** Pede as salas em que `pubkey` é mestre ou jogador. */
  | { t: 'listar'; pubkey: string }

/** Servidor → navegador. */
export type MensagemServidor =
  | { t: 'ola'; papel: 'mestre'; versao: number; estado: Estado }
  | { t: 'ola'; papel: 'jogador'; versao: number; foto: Foto }
  | { t: 'estado'; versao: number; estado: Estado }
  | { t: 'foto'; versao: number; foto: Foto }
  /** Confirma o `estado` do mestre: a versão nova. */
  | { t: 'ok'; versao: number }
  | { t: 'conflito'; versao: number; estado: Estado }
  | { t: 'salas'; salas: ResumoSala[] }
  | { t: 'recusado'; motivo: 'sala-nao-existe' | 'sala-de-outro-mestre' | 'invalido' | 'sem-permissao' }

/** Leitura defensiva de um Estado vindo da rede ou do arquivo do servidor. */
export function lerEstado(v: unknown): Estado | null {
  if (!ehObjeto(v)) return null
  const sala = lerSala(v.sala)
  return sala ? { sala, log: lerHistorico(v.log) ?? [], jogadores: lerJogadores(v.jogadores) } : null
}

export function lerMensagemCliente(texto: string): MensagemCliente | null {
  let v: unknown
  try {
    v = JSON.parse(texto)
  } catch {
    return null
  }
  if (!ehObjeto(v) || typeof v.t !== 'string') return null
  const nome = typeof v.nome === 'string' ? v.nome.slice(0, TAMANHO_MAXIMO_NOME) : ''
  switch (v.t) {
    case 'entrar':
      return typeof v.sala === 'string' && ID_SALA.test(v.sala) && ehPubkey(v.pubkey) ? { t: 'entrar', sala: v.sala, pubkey: v.pubkey, nome } : null
    case 'abrir': {
      const estado = lerEstado(v.estado)
      return typeof v.sala === 'string' && ID_SALA.test(v.sala) && ehPubkey(v.pubkey) && estado && Number.isInteger(v.versao)
        ? { t: 'abrir', sala: v.sala, pubkey: v.pubkey, nome, estado, versao: v.versao as number }
        : null
    }
    case 'estado': {
      const estado = lerEstado(v.estado)
      return estado && Number.isInteger(v.base) ? { t: 'estado', base: v.base as number, estado } : null
    }
    case 'listar':
      return ehPubkey(v.pubkey) ? { t: 'listar', pubkey: v.pubkey } : null
    case 'acao': {
      const acao = lerAcao(JSON.stringify({ v: 1, ...(ehObjeto(v.acao) ? v.acao : {}) }))
      return acao ? { t: 'acao', acao } : null
    }
    default:
      return null
  }
}

/** A conexão de quem joga em rede, como foi salva: só a sala (o servidor vem da configuração do app). */
export function lerConexao(v: unknown): { salaId: string } | null {
  return ehObjeto(v) && typeof v.salaId === 'string' && ID_SALA.test(v.salaId) ? { salaId: v.salaId } : null
}
