// O cofre: tranca um texto com uma senha para guardá-lo em lugar público (os relays). O app nunca guarda a senha.
// Senha → chave por PBKDF2 (SHA-256, 600 mil voltas, sal ligado à pubkey de quem guarda) → AES-GCM. O texto é
// comprimido (gzip) antes de trancar, e o resultado é um JSON curto: {"v":1,"iv":"…","ct":"…"} (base64).

const VOLTAS = 600_000
export const TAMANHO_MINIMO_SENHA_COFRE = 8

const codificador = new TextEncoder()
const decodificador = new TextDecoder()

const paraBase64 = (b: Uint8Array): string => {
  let s = ''
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(s)
}
const deBase64 = (t: string): Uint8Array => Uint8Array.from(atob(t), (c) => c.charCodeAt(0))

async function passar(dados: Uint8Array, fluxo: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const escritor = fluxo.writable.getWriter()
  void escritor.write(dados as BufferSource).then(() => escritor.close())
  return new Uint8Array(await new Response(fluxo.readable).arrayBuffer())
}

/** A chave do cofre de `pubkey` para esta senha. Custa cerca de meio segundo: derive uma vez e reuse. */
export async function chaveDoCofre(senha: string, pubkey: string, voltas = VOLTAS): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', codificador.encode(senha.normalize('NFKC')), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: codificador.encode(`rpg-cofre:${pubkey}`), iterations: voltas, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function trancar(texto: string, chave: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const comprimido = await passar(codificador.encode(texto), new CompressionStream('gzip'))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, comprimido as BufferSource))
  return JSON.stringify({ v: 1, iv: paraBase64(iv), ct: paraBase64(ct) })
}

/** Abre o que `trancar` fez. Devolve null se a senha estiver errada ou o conteúdo não for de um cofre. */
export async function abrir(conteudo: string, chave: CryptoKey): Promise<string | null> {
  try {
    const { v, iv, ct } = JSON.parse(conteudo) as { v?: unknown; iv?: unknown; ct?: unknown }
    if (v !== 1 || typeof iv !== 'string' || typeof ct !== 'string') return null
    const aberto = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(iv) as BufferSource }, chave, deBase64(ct) as BufferSource))
    return decodificador.decode(await passar(aberto, new DecompressionStream('gzip')))
  } catch {
    return null
  }
}
