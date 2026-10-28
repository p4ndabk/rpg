export const FACES = [3, 4, 6, 8, 10, 12, 20, 100, 1000] as const
export type Faces = (typeof FACES)[number]

export type Modo = 'desvantagem' | 'normal' | 'vantagem'
export type Desfecho = 'sucesso-critico' | 'sucesso' | 'falha' | 'falha-critica'

export interface Pedido {
  dado: Faces
  rotulo: string
  /** d20: teste contra a CD. */
  cd: number
  modificador: number
  modo: Modo
  /** Demais dados: soma de vários dados mais um bônus, como em 2d6 + 3. */
  quantidade: number
  bonus: number
}

interface RolagemBase {
  id: string
  rotulo: string
  faces: Faces
  dados: number[]
  total: number
  quando: number
  /** Rodada do combate em que a rolagem aconteceu. Ausente fora de combate e nas rolagens antigas. */
  rodada?: number
  /** Iniciativa do combate: o log agrupa essas rolagens num bloco só. */
  iniciativa?: true
  /** Rolagem do mestre que só ele vê: não vai para o log da mesa nem para o anúncio. */
  secreta?: true
}

export interface RolagemTeste extends RolagemBase {
  tipo: 'teste'
  cd: number
  modificador: number
  modo: Modo
  /** O dado que vale: o maior com vantagem, o menor com desvantagem. */
  natural: number
  desfecho: Desfecho
}

export interface RolagemSoma extends RolagemBase {
  tipo: 'soma'
  bonus: number
}

export type Rolagem = RolagemTeste | RolagemSoma

export const CD_MIN = 1
export const CD_MAX = 30
export const MOD_MIN = -10
export const MOD_MAX = 20
export const QTD_MIN = 1
export const QTD_MAX = 20

export const PEDIDO_PADRAO: Pedido = {
  dado: 20,
  rotulo: '',
  cd: 15,
  modificador: 0,
  modo: 'normal',
  quantidade: 1,
  bonus: 0,
}

export const MODOS: { valor: Modo; rotulo: string }[] = [
  { valor: 'desvantagem', rotulo: 'Desvantagem' },
  { valor: 'normal', rotulo: 'Normal' },
  { valor: 'vantagem', rotulo: 'Vantagem' },
]

/** Faixas de dificuldade com os nomes usados no Baldur's Gate 3. */
const DIFICULDADES = [
  { cd: 5, nome: 'Muito fácil' },
  { cd: 10, nome: 'Fácil' },
  { cd: 15, nome: 'Média' },
  { cd: 20, nome: 'Difícil' },
  { cd: 25, nome: 'Muito difícil' },
  { cd: 30, nome: 'Quase impossível' },
]

export function nomeDificuldade(cd: number): string {
  return (DIFICULDADES.find((d) => cd <= d.cd) ?? DIFICULDADES[DIFICULDADES.length - 1]!).nome
}

export function rolarDado(faces: number): number {
  // Maior múltiplo de "faces" que cabe em 32 bits: descartar o que passa evita viés no módulo.
  const limite = 2 ** 32 - (2 ** 32 % faces)
  const amostra = new Uint32Array(1)
  do {
    crypto.getRandomValues(amostra)
  } while (amostra[0]! >= limite)
  return (amostra[0]! % faces) + 1
}

export function escolherNatural(dados: number[], modo: Modo): number {
  if (modo === 'vantagem') return Math.max(...dados)
  if (modo === 'desvantagem') return Math.min(...dados)
  return dados[0]!
}

/** Como no BG3: 20 natural sempre passa e 1 natural sempre falha, seja qual for a CD. */
export function resolverDesfecho(natural: number, total: number, cd: number): Desfecho {
  if (natural === 20) return 'sucesso-critico'
  if (natural === 1) return 'falha-critica'
  return total >= cd ? 'sucesso' : 'falha'
}

/** O d20 faz teste contra a CD; os outros dados são somados. */
export function rolar(
  pedido: Pedido,
  sortear: (faces: number) => number = rolarDado,
  agora = Date.now(),
): Rolagem {
  const base = { id: crypto.randomUUID(), rotulo: pedido.rotulo.trim(), faces: pedido.dado, quando: agora }

  if (pedido.dado === 20) {
    const dados = pedido.modo === 'normal' ? [sortear(20)] : [sortear(20), sortear(20)]
    const natural = escolherNatural(dados, pedido.modo)
    const total = natural + pedido.modificador
    return {
      ...base,
      tipo: 'teste',
      dados,
      cd: pedido.cd,
      modificador: pedido.modificador,
      modo: pedido.modo,
      natural,
      total,
      desfecho: resolverDesfecho(natural, total, pedido.cd),
    }
  }

  const dados = Array.from({ length: pedido.quantidade }, () => sortear(pedido.dado))
  const soma = dados.reduce((a, b) => a + b, 0)
  return { ...base, tipo: 'soma', dados, bonus: pedido.bonus, total: soma + pedido.bonus }
}

export function comSinal(n: number): string {
  return n < 0 ? `− ${Math.abs(n)}` : `+ ${n}`
}

export function limitar(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Nome do dado na interface, sempre com D maiúsculo: D6, D20. */
export function nomeDado(faces: number): string {
  return `D${faces}`
}

/** Notação de RPG: 2D6 + 3. */
export function notacao(quantidade: number, faces: number, bonus = 0): string {
  const dados = `${quantidade}${nomeDado(faces)}`
  return bonus === 0 ? dados : `${dados} ${comSinal(bonus)}`
}

/** Menor e maior total possíveis de uma soma. */
export function faixa(pedido: Pedido): [number, number] {
  return [pedido.quantidade + pedido.bonus, pedido.quantidade * pedido.dado + pedido.bonus]
}

/** Quanto passou ou faltou para a CD, como o BG3 mostra depois do teste. */
export function margem(r: RolagemTeste): string {
  if (r.desfecho === 'sucesso-critico') return '20 natural: passa sempre!'
  if (r.desfecho === 'falha-critica') return '1 natural: falha sempre.'
  const diferenca = r.total - r.cd
  if (diferenca === 0) return 'Passou na conta exata.'
  return diferenca > 0 ? `Passou por ${diferenca}.` : `Faltou ${-diferenca}.`
}

/** Soma de dois ou mais dados em que todos tiraram o valor máximo. */
export function ehDanoMaximo(r: Rolagem): boolean {
  return r.tipo === 'soma' && r.dados.length >= 2 && r.dados.every((v) => v === r.faces)
}

/** Ajustes que reproduzem uma rolagem do histórico, para o botão "Repetir". */
export function pedidoDe(r: Rolagem, atual: Pedido): Pedido {
  if (r.tipo === 'teste') {
    return { ...atual, dado: 20, rotulo: r.rotulo, cd: r.cd, modificador: r.modificador, modo: r.modo }
  }
  return { ...atual, dado: r.faces, rotulo: r.rotulo, quantidade: r.dados.length, bonus: r.bonus }
}

export const MAX_HISTORICO = 50

export function noHistorico(historico: Rolagem[], ...novas: Rolagem[]): Rolagem[] {
  return [...novas.reverse(), ...historico].slice(0, MAX_HISTORICO)
}

/** Rolagem feita fora do rolador, como a iniciativa do combate. */
export function rolagemAvulsa(rotulo: string, faces: Faces, dados: number[], bonus = 0, agora = Date.now()): RolagemSoma {
  const total = dados.reduce((a, b) => a + b, 0) + bonus
  return { id: crypto.randomUUID(), tipo: 'soma', rotulo, faces, dados, bonus, total, quando: agora }
}

/** Marca em que momento do combate a rolagem aconteceu, para o log se organizar por rodada. */
export function noMomento(r: Rolagem, momento: { rodada?: number; iniciativa?: true; secreta?: true }): Rolagem {
  return {
    ...r,
    ...(momento.rodada ? { rodada: momento.rodada } : {}),
    ...(momento.iniciativa ? { iniciativa: true } : {}),
    ...(momento.secreta ? { secreta: true } : {}),
  }
}

/** A conta da rolagem por extenso, para o resultado e o histórico. */
export function descrever(r: Rolagem): string {
  if (r.tipo === 'teste') {
    const conta = `${r.natural} ${comSinal(r.modificador)} = ${r.total}`
    if (r.modo === 'normal') return conta
    return `${r.dados.join(' e ')} com ${r.modo}, fica o ${r.natural}: ${conta}`
  }
  const parcelas = r.dados.join(' + ')
  if (r.bonus === 0) return r.dados.length === 1 ? parcelas : `${parcelas} = ${r.total}`
  return `${parcelas} ${comSinal(r.bonus)} = ${r.total}`
}

// Leitura do que vem do localStorage: dado salvo pode estar velho, de uma versão
// anterior do app, ou corrompido. Campo inválido volta ao padrão; rolagem inválida é descartada.

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const ehModo = (v: unknown): v is Modo => MODOS.some((m) => m.valor === v)
const ehDesfecho = (v: unknown): v is Desfecho =>
  v === 'sucesso-critico' || v === 'sucesso' || v === 'falha' || v === 'falha-critica'
export const ehFaces = (v: unknown): v is Faces => FACES.includes(v as Faces)
const ehNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function inteiroEntre(v: unknown, min: number, max: number): number | undefined {
  return Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : undefined
}

/** A primeira versão (só d20) guardava o rótulo no campo "teste". */
function lerRotulo(v: Record<string, unknown>): string {
  if (typeof v.rotulo === 'string') return v.rotulo
  if (typeof v.teste === 'string') return v.teste
  return ''
}

export function lerPedido(v: unknown): Pedido | null {
  if (!ehObjeto(v)) return null
  const p = PEDIDO_PADRAO
  return {
    dado: ehFaces(v.dado) ? v.dado : p.dado,
    rotulo: lerRotulo(v),
    cd: inteiroEntre(v.cd, CD_MIN, CD_MAX) ?? p.cd,
    modificador: inteiroEntre(v.modificador, MOD_MIN, MOD_MAX) ?? p.modificador,
    modo: ehModo(v.modo) ? v.modo : p.modo,
    quantidade: inteiroEntre(v.quantidade, QTD_MIN, QTD_MAX) ?? p.quantidade,
    bonus: inteiroEntre(v.bonus, MOD_MIN, MOD_MAX) ?? p.bonus,
  }
}

function lerRolagem(v: unknown): Rolagem | null {
  if (!ehObjeto(v) || typeof v.id !== 'string' || !ehNumero(v.quando) || !ehNumero(v.total)) return null
  if (!Array.isArray(v.dados) || !v.dados.every(ehNumero)) return null
  const base = {
    id: v.id,
    rotulo: lerRotulo(v),
    dados: v.dados,
    total: v.total,
    quando: v.quando,
    ...(inteiroEntre(v.rodada, 1, 9999) !== undefined ? { rodada: v.rodada as number } : {}),
    ...(v.iniciativa === true ? { iniciativa: true as const } : {}),
    ...(v.secreta === true ? { secreta: true as const } : {}),
  }

  if (v.tipo === 'soma') {
    if (!ehFaces(v.faces) || !ehNumero(v.bonus)) return null
    return { ...base, tipo: 'soma', faces: v.faces, bonus: v.bonus }
  }

  // Sem "tipo": rolagem da primeira versão, que só tinha d20.
  if (v.tipo !== 'teste' && v.tipo !== undefined) return null
  if (!ehNumero(v.cd) || !ehNumero(v.modificador) || !ehNumero(v.natural)) return null
  if (!ehModo(v.modo) || !ehDesfecho(v.desfecho)) return null
  return {
    ...base,
    tipo: 'teste',
    faces: 20,
    cd: v.cd,
    modificador: v.modificador,
    modo: v.modo,
    natural: v.natural,
    desfecho: v.desfecho,
  }
}

export function lerHistorico(v: unknown): Rolagem[] | null {
  if (!Array.isArray(v)) return null
  return v.map(lerRolagem).filter((r) => r !== null)
}
