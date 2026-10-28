import { nip19, generateSecretKey, getPublicKey } from 'nostr-tools'
import { describe, expect, it } from 'vitest'
import { gerarIdentidade, lerEntrada, lerUsuario, npubCurta, npubDe } from './usuario'

describe('identidade', () => {
  it('gera uma nsec e a pubkey que combina com ela', () => {
    const { nsec, pubkey } = gerarIdentidade()
    expect(nsec).toMatch(/^nsec1/)
    expect(lerEntrada(nsec)).toEqual({ ok: true, pubkey, tipo: 'nsec' })
  })

  it('lê npub e aceita o prefixo nostr:', () => {
    const pubkey = getPublicKey(generateSecretKey())
    expect(lerEntrada(`nostr:${npubDe(pubkey)}`)).toEqual({ ok: true, pubkey, tipo: 'npub' })
  })

  it('recusa vazio, lixo e outros tipos de chave', () => {
    expect(lerEntrada('  ')).toEqual({ ok: false, motivo: 'vazia' })
    expect(lerEntrada('nsec1abc')).toEqual({ ok: false, motivo: 'invalida' })
    expect(lerEntrada('oi')).toEqual({ ok: false, motivo: 'invalida' })
    const nota = nip19.noteEncode('a'.repeat(64))
    expect(lerEntrada(nota)).toEqual({ ok: false, motivo: 'invalida' })
  })

  it('encurta a npub', () => {
    const pubkey = getPublicKey(generateSecretKey())
    expect(npubCurta(pubkey)).toMatch(/^npub1.{4}…/)
  })
})

describe('lerUsuario', () => {
  const pubkey = getPublicKey(generateSecretKey())
  it('lê de volta e limita o nome', () => {
    expect(lerUsuario({ pubkey, nome: ' Ana ' })).toEqual({ pubkey, nome: 'Ana' })
    expect(lerUsuario({ pubkey, nome: 'x'.repeat(80) })?.nome).toHaveLength(40)
    expect(lerUsuario({ pubkey })?.nome).toBe('Sem nome')
  })
  it('descarta chave que não é hexadecimal de 64 caracteres', () => {
    expect(lerUsuario({ pubkey: 'abc', nome: 'Ana' })).toBeNull()
    expect(lerUsuario(null)).toBeNull()
  })
})
