import { rolarDado } from './dados'

export type TipoPeca = 'personagem' | 'monstro'

export const TIPOS: { valor: TipoPeca; rotulo: string }[] = [
  { valor: 'personagem', rotulo: 'Personagem' },
  { valor: 'monstro', rotulo: 'Monstro' },
]

/** Peças prontas para colocar com um toque, sem digitar. */
export const ATALHOS: Record<TipoPeca, string[]> = {
  personagem: ['Guerreira', 'Mago', 'Ladina', 'Clérigo'],
  monstro: ['Goblin', 'Esqueleto', 'Lobo', 'Orc', 'Dragão'],
}

/** Pontos de vida das peças dos atalhos. Peça com nome próprio usa o padrão do tipo. */
const PV_ATALHO: Record<string, number> = {
  Guerreira: 28,
  Mago: 16,
  Ladina: 20,
  Clérigo: 22,
  Goblin: 7,
  Esqueleto: 13,
  Lobo: 11,
  Orc: 15,
  Dragão: 60,
}

export const PV_MIN = 1
export const PV_MAX = 999

export function pvPadrao(nome: string, tipo: TipoPeca): number {
  return PV_ATALHO[nome.trim().replace(/ \d+$/, '')] ?? (tipo === 'personagem' ? 20 : 10)
}

/** Os atalhos que têm vida base própria, com o valor de fábrica, para a tela de vida base. */
export const VIDA_DE_FABRICA: Readonly<Record<string, number>> = PV_ATALHO

/** Chaves da vida base para "qualquer outro herói" e "qualquer outro monstro" (nome que não é atalho). */
export const BASE_OUTRO: Record<TipoPeca, string> = { personagem: '#personagem', monstro: '#monstro' }

const nomeBase = (nome: string): string => nome.trim().replace(/ \d+$/, '')

/**
 * A vida com que uma peça nova nasce nesta sala: a vida base que o mestre definiu para o nome ("Goblin 2" vale como
 * "Goblin"), ou para o tipo (heróis e monstros fora dos atalhos), ou o valor de fábrica.
 */
export function pvDaPeca(sala: Pick<Sala, 'pvBase'>, nome: string, tipo: TipoPeca): number {
  const base = sala.pvBase
  return base?.[nomeBase(nome)] ?? (nomeBase(nome) in PV_ATALHO ? undefined : base?.[BASE_OUTRO[tipo]]) ?? pvPadrao(nome, tipo)
}

/** Condições que o mestre pode colocar numa peça, como etiqueta. */
export const CONDICOES = ['Caído', 'Envenenado', 'Atordoado', 'Com medo', 'Abençoado'] as const
export type Condicao = (typeof CONDICOES)[number]

/** Cenário que o mestre monta no tabuleiro. Quem joga vê tudo; paredes, árvores e pedras barram o caminho. */
export const TERRENOS = [
  { valor: 'parede', rotulo: 'Parede', bloqueia: true },
  { valor: 'porta', rotulo: 'Porta', bloqueia: false },
  { valor: 'agua', rotulo: 'Água', bloqueia: false },
  { valor: 'lava', rotulo: 'Lava', bloqueia: false },
  { valor: 'arvore', rotulo: 'Árvore', bloqueia: true },
  { valor: 'pedra', rotulo: 'Pedra', bloqueia: true },
  { valor: 'buraco', rotulo: 'Buraco', bloqueia: false },
] as const
export type Terreno = (typeof TERRENOS)[number]['valor']

export interface CasaDeCenario extends Casa {
  terreno: Terreno
}

export const ehTerreno = (v: unknown): v is Terreno => TERRENOS.some((t) => t.valor === v)
export const nomeTerreno = (t: Terreno): string => TERRENOS.find((x) => x.valor === t)!.rotulo
const bloqueia = (t: Terreno): boolean => TERRENOS.find((x) => x.valor === t)!.bloqueia

export interface Casa {
  coluna: number
  linha: number
}

export interface Peca extends Casa {
  id: string
  nome: string
  tipo: TipoPeca
  /** Pontos de vida atuais, de 0 a pvMax. Com 0, a peça está caída. */
  pv: number
  pvMax: number
  /** Chave pública de quem joga com a peça (personagem). Sem dono, só o mestre mexe. */
  dono?: string
  /** Escondida dos jogadores até o mestre revelar (emboscada). */
  oculta?: boolean
  condicoes?: Condicao[]
  /** Bônus de iniciativa da ficha (como o +3 de Destreza): soma ao D20 quando o combate começa. */
  bonusIniciativa?: number
  /** Quem é o personagem: aparência, história… Escrito por quem joga com ele (ou pelo mestre). */
  descricao?: string
  /** A CD do personagem (por exemplo a CD de magia ou de resistência). */
  cd?: number
}

export const DESCRICAO_MAX = 600
export const CD_FICHA_MIN = 1
export const CD_FICHA_MAX = 30

/** O que quem joga edita na ficha do próprio personagem. */
export interface CamposFicha {
  descricao: string
  /** Null tira a CD da ficha. */
  cd: number | null
  bonusIniciativa: number
}

export const BONUS_INICIATIVA_MIN = -10
export const BONUS_INICIATIVA_MAX = 20

export interface Combate {
  /** Ordem de iniciativa, da maior para a menor. */
  ordem: { id: string; iniciativa: number }[]
  /** Índice em "ordem" de quem está na vez. */
  vez: number
  rodada: number
}

export interface Sala {
  id: string
  nome: string
  colunas: number
  linhas: number
  pecas: Peca[]
  combate: Combate | null
  /** Chave pública de quem conduz a sessão. Salas antigas não têm: quem abrir primeiro vira o mestre. */
  mestre?: string
  /** Casas pintadas pelo mestre. Casa que não está na lista é chão livre. */
  cenario?: CasaDeCenario[]
  /** Vida base que o mestre definiu por nome de peça (ou `#personagem` / `#monstro`). O que falta usa o valor de fábrica. */
  pvBase?: Record<string, number>
}

// Colunas vão de A a Z, para cada casa ter um nome curto como C4.
export const COLUNAS_MIN = 4
export const COLUNAS_MAX = 26
export const LINHAS_MIN = 4
export const LINHAS_MAX = 20
export const COLUNAS_PADRAO = 12
export const LINHAS_PADRAO = 8

export function criarSala(
  nome: string,
  colunas: number,
  linhas: number,
  id: string = crypto.randomUUID(),
  mestre?: string,
): Sala {
  return { id, nome: nome.trim() || 'Minha sala', colunas, linhas, pecas: [], combate: null, ...(mestre ? { mestre } : {}) }
}

export const ehMestre = (sala: Sala, pubkey: string | undefined): boolean => pubkey !== undefined && sala.mestre === pubkey

/** O mestre vê tudo; quem joga não vê peça escondida. */
export function pecasVisiveis(sala: Sala, mestre: boolean): Peca[] {
  return mestre ? sala.pecas : sala.pecas.filter((p) => !p.oculta)
}

/** O mestre move qualquer peça; quem joga move só as suas. */
export function podeMover(peca: Peca, mestre: boolean, pubkey: string | undefined): boolean {
  return mestre || (pubkey !== undefined && peca.dono === pubkey)
}

/** Menor tamanho que ainda comporta todas as peças: encolher o grid nunca deixa peça fora dele. */
export function tamanhoMinimo(sala: Sala): { colunas: number; linhas: number } {
  return {
    colunas: Math.max(COLUNAS_MIN, ...sala.pecas.map((p) => p.coluna + 1)),
    linhas: Math.max(LINHAS_MIN, ...sala.pecas.map((p) => p.linha + 1)),
  }
}

/** Muda o nome e o tamanho da sala. O tamanho respeita os limites e as peças que já estão no grid. */
export function editarSala(sala: Sala, nome: string, colunas: number, linhas: number): Sala {
  const minimo = tamanhoMinimo(sala)
  const entre = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)))
  const nova = {
    ...sala,
    nome: nome.trim() || sala.nome,
    colunas: entre(colunas, minimo.colunas, COLUNAS_MAX),
    linhas: entre(linhas, minimo.linhas, LINHAS_MAX),
  }
  // O cenário que ficou fora do grid some junto com as casas.
  return nova.cenario ? comCenario(nova, nova.cenario.filter((c) => dentro(nova, c))) : nova
}

function comCenario(sala: Sala, cenario: CasaDeCenario[]): Sala {
  const { cenario: _antigo, ...resto } = sala
  return cenario.length ? { ...resto, cenario } : resto
}

export function terrenoEm(sala: Sala, coluna: number, linha: number): Terreno | undefined {
  return sala.cenario?.find((c) => c.coluna === coluna && c.linha === linha)?.terreno
}

/** Casa onde ninguém passa: parede, árvore ou pedra. */
export function casaBloqueada(sala: Sala, coluna: number, linha: number): boolean {
  const t = terrenoEm(sala, coluna, linha)
  return t !== undefined && bloqueia(t)
}

/** Pinta as casas com o terreno (ou apaga, com null). Terreno que barra não cobre casa com peça em cima. */
export function pintar(sala: Sala, casas: Casa[], terreno: Terreno | null): Sala {
  const alvo = new Set(casas.filter((c) => dentro(sala, c)).map((c) => `${c.coluna},${c.linha}`))
  const sem = (sala.cenario ?? []).filter((c) => !alvo.has(`${c.coluna},${c.linha}`))
  if (terreno === null) return comCenario(sala, sem)
  const novas: CasaDeCenario[] = [...alvo]
    .map((k) => {
      const [coluna, linha] = k.split(',').map(Number) as [number, number]
      return { coluna, linha, terreno }
    })
    .filter((c) => !(bloqueia(terreno) && pecaEm(sala, c.coluna, c.linha)))
  // Quem ficou de fora por ter peça em cima mantém o terreno antigo.
  const mantidas = (sala.cenario ?? []).filter((c) => alvo.has(`${c.coluna},${c.linha}`) && !novas.some((n) => n.coluna === c.coluna && n.linha === c.linha))
  return comCenario(sala, [...sem, ...mantidas, ...novas])
}

export type Forma = 'pincel' | 'linha' | 'retangulo' | 'contorno'

/** As casas de uma forma desenhada do ponto `a` ao ponto `b`. */
export function casasDaForma(forma: Forma, a: Casa, b: Casa): Casa[] {
  if (forma === 'pincel') return [b]
  if (forma === 'linha') {
    // Bresenham: uma linha reta sem buracos, em qualquer direção.
    const casas: Casa[] = []
    let { coluna: x, linha: y } = a
    const dx = Math.abs(b.coluna - a.coluna)
    const dy = -Math.abs(b.linha - a.linha)
    const sx = a.coluna < b.coluna ? 1 : -1
    const sy = a.linha < b.linha ? 1 : -1
    let erro = dx + dy
    for (;;) {
      casas.push({ coluna: x, linha: y })
      if (x === b.coluna && y === b.linha) break
      const e2 = 2 * erro
      if (e2 >= dy) {
        erro += dy
        x += sx
      }
      if (e2 <= dx) {
        erro += dx
        y += sy
      }
    }
    return casas
  }
  const [c0, c1] = [Math.min(a.coluna, b.coluna), Math.max(a.coluna, b.coluna)]
  const [l0, l1] = [Math.min(a.linha, b.linha), Math.max(a.linha, b.linha)]
  const casas: Casa[] = []
  for (let linha = l0; linha <= l1; linha++) {
    for (let coluna = c0; coluna <= c1; coluna++) {
      if (forma === 'retangulo' || coluna === c0 || coluna === c1 || linha === l0 || linha === l1) casas.push({ coluna, linha })
    }
  }
  return casas
}

/** Nome da casa no estilo de tabuleiro: coluna em letra, linha em número (A1 no canto de cima). */
export function nomeCasa(coluna: number, linha: number): string {
  return `${String.fromCharCode(65 + coluna)}${linha + 1}`
}

export function pecaEm(sala: Sala, coluna: number, linha: number): Peca | undefined {
  return sala.pecas.find((p) => p.coluna === coluna && p.linha === linha)
}

function dentro(sala: Sala, { coluna, linha }: Casa): boolean {
  return coluna >= 0 && coluna < sala.colunas && linha >= 0 && linha < sala.linhas
}

/** Primeira casa vazia, lendo linha por linha a partir de A1; null com o grid cheio. */
export function primeiraCasaLivre(sala: Sala): Casa | null {
  for (let linha = 0; linha < sala.linhas; linha++) {
    for (let coluna = 0; coluna < sala.colunas; coluna++) {
      if (!pecaEm(sala, coluna, linha) && !casaBloqueada(sala, coluna, linha)) return { coluna, linha }
    }
  }
  return null
}

/** A casa livre mais perto de `origem` (em passos, na diagonal também), para um grupo ficar junto. Null com o grid cheio. */
export function casaLivrePerto(sala: Sala, origem: Casa): Casa | null {
  let melhor: Casa | null = null
  let distancia = Infinity
  for (let linha = 0; linha < sala.linhas; linha++) {
    for (let coluna = 0; coluna < sala.colunas; coluna++) {
      if (pecaEm(sala, coluna, linha) || casaBloqueada(sala, coluna, linha)) continue
      const d = Math.max(Math.abs(coluna - origem.coluna), Math.abs(linha - origem.linha))
      if (d < distancia) {
        distancia = d
        melhor = { coluna, linha }
      }
    }
  }
  return melhor
}

/** Três goblins viram "Goblin", "Goblin 2" e "Goblin 3", para o log não ficar ambíguo. */
export function nomeUnico(sala: Sala, nome: string): string {
  const base = nome.trim()
  const usados = new Set(sala.pecas.map((p) => p.nome.toLowerCase()))
  if (!usados.has(base.toLowerCase())) return base
  let n = 2
  while (usados.has(`${base} ${n}`.toLowerCase())) n++
  return `${base} ${n}`
}

/**
 * Coloca a peça na casa pedida, se estiver livre, ou na primeira casa livre.
 * Com o grid cheio ou nome vazio, a sala volta igual.
 */
export function adicionarPeca(
  sala: Sala,
  nome: string,
  tipo: TipoPeca,
  id: string = crypto.randomUUID(),
  casa?: Casa,
  pvMax?: number,
  dono?: string,
): Sala {
  const destino = casa && dentro(sala, casa) && !pecaEm(sala, casa.coluna, casa.linha) && !casaBloqueada(sala, casa.coluna, casa.linha) ? casa : primeiraCasaLivre(sala)
  if (!destino || !nome.trim()) return sala
  const vida = Math.min(PV_MAX, Math.max(PV_MIN, Math.round(pvMax ?? pvDaPeca(sala, nome, tipo))))
  const peca: Peca = { id, nome: nomeUnico(sala, nome), tipo, coluna: destino.coluna, linha: destino.linha, pv: vida, pvMax: vida, ...(dono ? { dono } : {}) }
  return { ...sala, pecas: [...sala.pecas, peca] }
}

/** Fora do grid ou em casa ocupada por outra peça, nada muda. */
export function moverPeca(sala: Sala, id: string, coluna: number, linha: number): Sala {
  const ocupante = pecaEm(sala, coluna, linha)
  if (!dentro(sala, { coluna, linha }) || (ocupante && ocupante.id !== id) || casaBloqueada(sala, coluna, linha)) return sala
  return { ...sala, pecas: sala.pecas.map((p) => (p.id === id ? { ...p, coluna, linha } : p)) }
}

/**
 * Define a vida base de várias peças de uma vez: `valores` mapeia nome (ou `#personagem` / `#monstro`) a PV; null volta
 * ao valor de fábrica. Com `nasPecas`, as peças que já estão no tabuleiro com esse nome ganham o novo máximo e a vida cheia.
 */
export function definirPvBase(sala: Sala, valores: Record<string, number | null>, nasPecas = false): Sala {
  const base = { ...sala.pvBase }
  for (const [nome, pv] of Object.entries(valores)) {
    if (pv === null) delete base[nome]
    else base[nome] = Math.min(PV_MAX, Math.max(PV_MIN, Math.round(pv)))
  }
  const { pvBase: _antiga, ...resto } = sala
  let nova: Sala = Object.keys(base).length ? { ...resto, pvBase: base } : resto
  if (nasPecas) {
    nova = {
      ...nova,
      pecas: nova.pecas.map((p) => {
        // Só mexe nas peças cujo nome foi citado (ou, para `#tipo`, nas que não são atalho).
        const citada = nomeBase(p.nome) in valores || (!(nomeBase(p.nome) in PV_ATALHO) && BASE_OUTRO[p.tipo] in valores)
        if (!citada) return p
        const vida = pvDaPeca(nova, p.nome, p.tipo)
        return { ...p, pv: vida, pvMax: vida }
      }),
    }
  }
  return nova
}

/** Define os pontos de vida da peça: o máximo e, se vier, o atual (sem ele, a peça fica com a vida cheia). */
export function definirPv(sala: Sala, id: string, pvMax: number, pv?: number): Sala {
  const max = Math.min(PV_MAX, Math.max(PV_MIN, Math.round(pvMax)))
  return {
    ...sala,
    pecas: sala.pecas.map((p) => (p.id === id ? { ...p, pvMax: max, pv: Math.min(max, Math.max(0, Math.round(pv ?? max))) } : p)),
  }
}

/** Soma (ou tira, se negativo) pontos de vida, sem passar de 0 nem do máximo. */
export function alterarPv(sala: Sala, id: string, delta: number): Sala {
  return {
    ...sala,
    pecas: sala.pecas.map((p) => (p.id === id ? { ...p, pv: Math.min(p.pvMax, Math.max(0, p.pv + delta)) } : p)),
  }
}

/** Dá a peça a quem joga (chave pública) ou tira o dono, deixando a peça só com o mestre. */
export function definirDono(sala: Sala, id: string, pubkey: string | undefined): Sala {
  return {
    ...sala,
    pecas: sala.pecas.map((p) => {
      if (p.id !== id) return p
      const { dono: _antigo, ...resto } = p
      return pubkey ? { ...resto, dono: pubkey } : resto
    }),
  }
}

export function alternarOculta(sala: Sala, id: string): Sala {
  return { ...sala, pecas: sala.pecas.map((p) => (p.id === id ? { ...p, oculta: !p.oculta } : p)) }
}

export function alternarCondicao(sala: Sala, id: string, condicao: Condicao): Sala {
  return {
    ...sala,
    pecas: sala.pecas.map((p) => {
      if (p.id !== id) return p
      const atuais = p.condicoes ?? []
      const novas = atuais.includes(condicao) ? atuais.filter((c) => c !== condicao) : [...atuais, condicao]
      const { condicoes: _antigas, ...resto } = p
      return novas.length ? { ...resto, condicoes: novas } : resto
    }),
  }
}

/** Muda a iniciativa de uma peça e reordena, sem tirar a vez de quem está jogando. */
export function definirIniciativa(sala: Sala, id: string, valor: number): Sala {
  if (!sala.combate) return sala
  const { ordem, vez, rodada } = sala.combate
  const naVez = ordem[vez]?.id
  const nova = ordem.map((o) => (o.id === id ? { ...o, iniciativa: valor } : o))
  // Ordenação estável: no empate, quem já estava antes continua antes.
  const reordenada = [...nova].sort((a, b) => b.iniciativa - a.iniciativa)
  const novaVez = Math.max(0, reordenada.findIndex((o) => o.id === naVez))
  return { ...sala, combate: { ordem: reordenada, vez: novaVez, rodada } }
}

export function removerPeca(sala: Sala, id: string): Sala {
  const pecas = sala.pecas.filter((p) => p.id !== id)
  if (!sala.combate) return { ...sala, pecas }
  const { ordem, vez, rodada } = sala.combate
  const indice = ordem.findIndex((o) => o.id === id)
  if (indice === -1) return { ...sala, pecas }
  const novaOrdem = ordem.filter((o) => o.id !== id)
  if (novaOrdem.length === 0) return { ...sala, pecas, combate: null }
  // Quem sai antes da vez puxa o índice para trás; se saiu quem estava na vez, o próximo assume.
  const novaVez = indice < vez ? vez - 1 : vez
  return { ...sala, pecas, combate: { ordem: novaOrdem, vez: novaVez % novaOrdem.length, rodada } }
}

/**
 * Rola um D20 de iniciativa para cada peça, soma o bônus de iniciativa da ficha e ordena da maior para a menor.
 * No empate, personagem age antes de monstro; depois, ordem alfabética.
 */
export function iniciarCombate(
  sala: Sala,
  sortear: (faces: number) => number = rolarDado,
): { sala: Sala; iniciativas: { peca: Peca; valor: number; dado: number; bonus: number }[] } {
  const iniciativas = sala.pecas.map((peca) => {
    const dado = sortear(20)
    const bonus = peca.bonusIniciativa ?? 0
    return { peca, valor: dado + bonus, dado, bonus }
  })
  const ordem = [...iniciativas]
    .sort(
      (a, b) =>
        b.valor - a.valor ||
        (a.peca.tipo === b.peca.tipo ? 0 : a.peca.tipo === 'personagem' ? -1 : 1) ||
        a.peca.nome.localeCompare(b.peca.nome, 'pt-BR'),
    )
    .map(({ peca, valor }) => ({ id: peca.id, iniciativa: valor }))
  return { sala: { ...sala, combate: { ordem, vez: 0, rodada: 1 } }, iniciativas }
}

/** Edita a ficha do personagem: descrição, CD e bônus de iniciativa. Campo vazio ou fora dos limites some da ficha. */
export function editarFicha(sala: Sala, id: string, campos: CamposFicha): Sala {
  const descricao = campos.descricao.trim().slice(0, DESCRICAO_MAX)
  const cd = campos.cd === null || !Number.isFinite(campos.cd) ? null : Math.min(CD_FICHA_MAX, Math.max(CD_FICHA_MIN, Math.round(campos.cd)))
  const bonus = Math.min(BONUS_INICIATIVA_MAX, Math.max(BONUS_INICIATIVA_MIN, Math.round(campos.bonusIniciativa) || 0))
  return {
    ...sala,
    pecas: sala.pecas.map((p) => {
      if (p.id !== id) return p
      const { descricao: _d, cd: _c, bonusIniciativa: _b, ...resto } = p
      return { ...resto, ...(descricao ? { descricao } : {}), ...(cd !== null ? { cd } : {}), ...(bonus !== 0 ? { bonusIniciativa: bonus } : {}) }
    }),
  }
}

/** Define o bônus de iniciativa da ficha (de -10 a +20; zero tira o campo). */
export function definirBonusIniciativa(sala: Sala, id: string, bonus: number): Sala {
  const n = Math.min(BONUS_INICIATIVA_MAX, Math.max(BONUS_INICIATIVA_MIN, Math.round(bonus)))
  return {
    ...sala,
    pecas: sala.pecas.map((p) => {
      if (p.id !== id) return p
      const { bonusIniciativa: _antigo, ...resto } = p
      return n === 0 ? resto : { ...resto, bonusIniciativa: n }
    }),
  }
}

export function passarVez(sala: Sala): Sala {
  if (!sala.combate) return sala
  const { ordem, vez, rodada } = sala.combate
  const fimDaRodada = vez + 1 >= ordem.length
  return { ...sala, combate: { ordem, vez: fimDaRodada ? 0 : vez + 1, rodada: fimDaRodada ? rodada + 1 : rodada } }
}

export function encerrarCombate(sala: Sala): Sala {
  return { ...sala, combate: null }
}

export function daVez(sala: Sala): Peca | undefined {
  const atual = sala.combate?.ordem[sala.combate.vez]
  return atual && sala.pecas.find((p) => p.id === atual.id)
}

/**
 * A vez acabou de chegar numa peça de `pubkey`? `anterior` é o id de quem estava na vez antes (undefined: ninguém).
 * Serve para avisar quem joga na hora em que é a sua vez, e só nela.
 */
export function vezChegouParaMim(anterior: string | undefined, atual: Peca | undefined, pubkey: string | undefined): boolean {
  return atual !== undefined && pubkey !== undefined && atual.dono === pubkey && atual.id !== anterior
}

/** Duas letras para a ficha: "Goblin Arqueiro" vira GA, "Goblin 2" vira G2, "Lich" vira LI. */
export function iniciais(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean)
  if (palavras.length >= 2) return (palavras[0]![0]! + palavras[1]![0]!).toUpperCase()
  return (palavras[0] ?? '?').slice(0, 2).toUpperCase()
}

// Leitura do localStorage: peça inválida, fora do grid ou repetida na mesma casa é descartada.

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const ehTipo = (v: unknown): v is TipoPeca => TIPOS.some((t) => t.valor === v)
const inteiroEntre = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max

function lerCombate(v: unknown, pecas: Peca[]): Combate | null {
  if (!ehObjeto(v) || !Array.isArray(v.ordem) || !inteiroEntre(v.rodada, 1, Number.MAX_SAFE_INTEGER)) return null
  const ids = new Set(pecas.map((p) => p.id))
  const ordem = v.ordem.filter(
    (o): o is { id: string; iniciativa: number } =>
      ehObjeto(o) && typeof o.id === 'string' && ids.has(o.id) && typeof o.iniciativa === 'number',
  )
  if (ordem.length === 0) return null
  return { ordem, vez: inteiroEntre(v.vez, 0, ordem.length - 1) ? v.vez : 0, rodada: v.rodada }
}

export function lerSala(v: unknown): Sala | null {
  if (!ehObjeto(v) || typeof v.id !== 'string' || typeof v.nome !== 'string') return null
  if (!inteiroEntre(v.colunas, COLUNAS_MIN, COLUNAS_MAX) || !inteiroEntre(v.linhas, LINHAS_MIN, LINHAS_MAX)) return null
  const sala: Sala = {
    id: v.id,
    nome: v.nome,
    colunas: v.colunas,
    linhas: v.linhas,
    pecas: [],
    combate: null,
    ...(typeof v.mestre === 'string' && /^[0-9a-f]{64}$/.test(v.mestre) ? { mestre: v.mestre } : {}),
  }
  const vistas = new Set<string>()
  const cenario: CasaDeCenario[] = []
  for (const c of Array.isArray(v.cenario) ? v.cenario : []) {
    if (!ehObjeto(c) || !ehTerreno(c.terreno)) continue
    if (!inteiroEntre(c.coluna, 0, sala.colunas - 1) || !inteiroEntre(c.linha, 0, sala.linhas - 1)) continue
    const chave = `${c.coluna},${c.linha}`
    if (vistas.has(chave)) continue
    vistas.add(chave)
    cenario.push({ coluna: c.coluna, linha: c.linha, terreno: c.terreno })
  }
  if (cenario.length) sala.cenario = cenario
  if (ehObjeto(v.pvBase)) {
    const base: Record<string, number> = {}
    for (const [nome, pv] of Object.entries(v.pvBase).slice(0, 60)) {
      if (nome.length > 0 && nome.length <= 31 && inteiroEntre(pv, PV_MIN, PV_MAX)) base[nome] = pv
    }
    if (Object.keys(base).length) sala.pvBase = base
  }
  for (const p of Array.isArray(v.pecas) ? v.pecas : []) {
    if (!ehObjeto(p) || typeof p.id !== 'string' || typeof p.nome !== 'string' || !ehTipo(p.tipo)) continue
    if (!inteiroEntre(p.coluna, 0, sala.colunas - 1) || !inteiroEntre(p.linha, 0, sala.linhas - 1)) continue
    if (pecaEm(sala, p.coluna, p.linha)) continue
    // Sala salva antes dos pontos de vida: a peça ganha o padrão e começa com a vida cheia.
    const pvMax = inteiroEntre(p.pvMax, PV_MIN, PV_MAX) ? p.pvMax : pvPadrao(p.nome, p.tipo)
    const pv = inteiroEntre(p.pv, 0, pvMax) ? p.pv : pvMax
    const condicoes = Array.isArray(p.condicoes) ? CONDICOES.filter((c) => (p.condicoes as unknown[]).includes(c)) : []
    sala.pecas.push({
      id: p.id,
      nome: p.nome,
      tipo: p.tipo,
      coluna: p.coluna,
      linha: p.linha,
      pv,
      pvMax,
      ...(typeof p.dono === 'string' && /^[0-9a-f]{64}$/.test(p.dono) ? { dono: p.dono } : {}),
      ...(p.oculta === true ? { oculta: true } : {}),
      ...(typeof p.descricao === 'string' && p.descricao.trim() ? { descricao: p.descricao.trim().slice(0, DESCRICAO_MAX) } : {}),
      ...(inteiroEntre(p.cd, CD_FICHA_MIN, CD_FICHA_MAX) ? { cd: p.cd } : {}),
      ...(inteiroEntre(p.bonusIniciativa, BONUS_INICIATIVA_MIN, BONUS_INICIATIVA_MAX) && p.bonusIniciativa !== 0 ? { bonusIniciativa: p.bonusIniciativa } : {}),
      ...(condicoes.length ? { condicoes } : {}),
    })
  }
  sala.combate = lerCombate(v.combate, sala.pecas)
  return sala
}
