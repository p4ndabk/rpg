import { getPublicKey, nip19 } from 'nostr-tools'
import { decrypt, encrypt } from 'nostr-tools/nip49'

// Arquivo de credencial: a nsec, para a pessoa guardar e entrar em outro navegador. A senha é opcional: com ela a nsec
// vai trancada (NIP-49, o formato "ncryptsec" do Nostr); sem ela, vai aberta (quem pegar o arquivo entra como a pessoa). O app nunca guarda a nsec: ela só passa por aqui quando a pessoa baixa o arquivo (na
// hora de criar ou de colar a chave) ou sobe o arquivo e digita a senha; depois de achar a chave pública, é descartada.
//
// {
//   "rpg": "credencial", "v": 1,
//   "nome": "Zé do Cordel",
//   "npub": "npub1…",           // só para reconhecer o arquivo; a conferência é pela chave aberta
//   "ncryptsec": "ncryptsec1…"  // com senha; sem senha o campo é "nsec": "nsec1…"
// }

export const TAMANHO_MINIMO_SENHA = 8
/** Custo do scrypt: 2^16 leva cerca de 1 s no navegador, o bastante para atrapalhar quem tenta adivinhar a senha. */
const CUSTO_PADRAO = 16
const MAXIMO_BYTES = 8 * 1024

export interface Credencial {
  rpg: 'credencial'
  v: 1
  nome: string
  npub: string
  /** Com senha. */
  ncryptsec?: string
  /** Sem senha: a nsec aberta. */
  nsec?: string
}

export type ErroSenha = 'curta' | 'diferente'

/** Confere a senha nova e a confirmação. Senha vazia vale (arquivo sem senha); preenchida, tem mínimo e confirmação. */
export function validarSenha(senha: string, confirmacao: string): ErroSenha | null {
  if (senha === '' && confirmacao === '') return null
  if (senha.length < TAMANHO_MINIMO_SENHA) return 'curta'
  return senha === confirmacao ? null : 'diferente'
}

/** Monta o texto do arquivo (JSON). Senha vazia grava a nsec aberta. Lança se a nsec não for válida. */
export function criarCredencial(nsec: string, nome: string, senha: string, custo = CUSTO_PADRAO): string {
  const d = nip19.decode(nsec.trim().replace(/^nostr:/, ''))
  if (d.type !== 'nsec') throw new Error('não é uma nsec')
  const credencial: Credencial = {
    rpg: 'credencial',
    v: 1,
    nome: nome.trim().slice(0, 40) || 'Sem nome',
    npub: nip19.npubEncode(getPublicKey(d.data)),
    ...(senha === '' ? { nsec: nip19.nsecEncode(d.data) } : { ncryptsec: encrypt(d.data, senha, custo) }),
  }
  return JSON.stringify(credencial, null, 2) + '\n'
}

/** "rpg-credencial-ze-do-cordel.json": sem acento nem espaço, para qualquer sistema de arquivos. */
export function nomeDoArquivo(nome: string): string {
  const slug = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
  return `rpg-credencial-${slug || 'jogador'}.json`
}

/** Lê o arquivo sem abrir a chave: serve para conferir se é uma credencial do RPG antes de pedir a senha. */
export function lerCredencial(texto: string): Credencial | null {
  if (texto.length > MAXIMO_BYTES) return null
  let v: unknown
  try {
    v = JSON.parse(texto)
  } catch {
    return null
  }
  if (typeof v !== 'object' || v === null) return null
  const c = v as Record<string, unknown>
  if (c.rpg !== 'credencial' || c.v !== 1 || typeof c.npub !== 'string') return null
  const trancada = typeof c.ncryptsec === 'string' && c.ncryptsec.startsWith('ncryptsec1')
  const aberta = typeof c.nsec === 'string' && c.nsec.startsWith('nsec1')
  if (!trancada && !aberta) return null
  const nome = typeof c.nome === 'string' ? c.nome.trim().slice(0, 40) : ''
  return { rpg: 'credencial', v: 1, nome: nome || 'Sem nome', npub: c.npub, ...(trancada ? { ncryptsec: c.ncryptsec as string } : { nsec: c.nsec as string }) }
}

/** O arquivo precisa de senha para abrir? Serve para a tela só pedir a senha quando há uma. */
export const pedeSenha = (c: Credencial): boolean => c.ncryptsec !== undefined

export type Aberta = { ok: true; pubkey: string; nome: string } | { ok: false; motivo: 'arquivo' | 'senha' }

/** Abre a credencial com a senha e devolve só a parte pública. A chave secreta não sai daqui. */
export function abrirCredencial(texto: string, senha: string): Aberta {
  const c = lerCredencial(texto)
  if (!c) return { ok: false, motivo: 'arquivo' }
  let pubkey: string
  try {
    if (c.ncryptsec !== undefined) pubkey = getPublicKey(decrypt(c.ncryptsec, senha))
    else {
      const d = nip19.decode(c.nsec ?? '')
      if (d.type !== 'nsec') return { ok: false, motivo: 'arquivo' }
      pubkey = getPublicKey(d.data)
    }
  } catch {
    return { ok: false, motivo: 'senha' }
  }
  // O npub do arquivo é só um rótulo: se não bate com a chave aberta, o arquivo foi mexido.
  try {
    const d = nip19.decode(c.npub)
    if (d.type !== 'npub' || d.data !== pubkey) return { ok: false, motivo: 'arquivo' }
  } catch {
    return { ok: false, motivo: 'arquivo' }
  }
  return { ok: true, pubkey, nome: c.nome }
}
