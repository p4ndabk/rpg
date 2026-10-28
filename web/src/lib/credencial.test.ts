import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools'
import { describe, expect, it } from 'vitest'
import { abrirCredencial, criarCredencial, lerCredencial, nomeDoArquivo, pedeSenha, validarSenha } from './credencial'

// Custo baixo só nos testes (o scrypt do app leva cerca de 1 s).
const CUSTO = 8
const sk = generateSecretKey()
const nsec = nip19.nsecEncode(sk)
const pubkey = getPublicKey(sk)

describe('credencial', () => {
  it('cria o arquivo sem a nsec aberta e abre com a senha certa', () => {
    const texto = criarCredencial(nsec, 'Zé do Cordel', 'senha-boa-123', CUSTO)
    expect(texto).not.toContain('nsec1')
    expect(JSON.parse(texto)).toMatchObject({ rpg: 'credencial', v: 1, nome: 'Zé do Cordel', npub: nip19.npubEncode(pubkey) })
    expect(abrirCredencial(texto, 'senha-boa-123')).toEqual({ ok: true, pubkey, nome: 'Zé do Cordel' })
  })

  it('senha errada não abre', () => {
    const texto = criarCredencial(nsec, 'Ana', 'senha-boa-123', CUSTO)
    expect(abrirCredencial(texto, 'outra-senha-1')).toEqual({ ok: false, motivo: 'senha' })
  })

  it('arquivo mexido (npub trocado) é recusado', () => {
    const outra = nip19.npubEncode(getPublicKey(generateSecretKey()))
    const mexido = JSON.stringify({ ...JSON.parse(criarCredencial(nsec, 'Ana', 'senha-boa-123', CUSTO)), npub: outra })
    expect(abrirCredencial(mexido, 'senha-boa-123')).toEqual({ ok: false, motivo: 'arquivo' })
  })

  it('lixo, outro JSON e arquivo grande demais não são credencial', () => {
    expect(lerCredencial('oi')).toBeNull()
    expect(lerCredencial('{"rpg":"outra","v":1}')).toBeNull()
    expect(lerCredencial('{"rpg":"credencial","v":1,"npub":"x","ncryptsec":"abc"}')).toBeNull()
    expect(lerCredencial(' '.repeat(9000))).toBeNull()
    expect(abrirCredencial('oi', 'x')).toEqual({ ok: false, motivo: 'arquivo' })
  })

  it('só cria a partir de uma nsec', () => {
    expect(() => criarCredencial(nip19.npubEncode(pubkey), 'Ana', 'senha-boa-123', CUSTO)).toThrow()
  })

  it('sem senha: o arquivo leva a nsec aberta e abre sem pedir nada', () => {
    const texto = criarCredencial(nsec, 'Zé', '', CUSTO)
    expect(JSON.parse(texto)).toMatchObject({ nsec, npub: nip19.npubEncode(pubkey) })
    expect(JSON.parse(texto).ncryptsec).toBeUndefined()
    expect(pedeSenha(lerCredencial(texto)!)).toBe(false)
    expect(abrirCredencial(texto, '')).toEqual({ ok: true, pubkey, nome: 'Zé' })
  })

  it('com senha, o arquivo pede senha; sem senha, o npub trocado também é recusado', () => {
    expect(pedeSenha(lerCredencial(criarCredencial(nsec, 'Zé', 'senha-boa-123', CUSTO))!)).toBe(true)
    const outra = nip19.npubEncode(getPublicKey(generateSecretKey()))
    const mexido = JSON.stringify({ ...JSON.parse(criarCredencial(nsec, 'Zé', '', CUSTO)), npub: outra })
    expect(abrirCredencial(mexido, '')).toEqual({ ok: false, motivo: 'arquivo' })
  })

  it('senha: vazia vale; preenchida tem mínimo de 8 e confirmação igual', () => {
    expect(validarSenha('', '')).toBeNull()
    expect(validarSenha('curta', 'curta')).toBe('curta')
    expect(validarSenha('senha-boa-123', 'senha-boa-124')).toBe('diferente')
    expect(validarSenha('senha-boa-123', 'senha-boa-123')).toBeNull()
  })

  it('nome do arquivo: sem acento, espaço nem símbolo', () => {
    expect(nomeDoArquivo('Zé do Cordel!')).toBe('rpg-credencial-ze-do-cordel.json')
    expect(nomeDoArquivo('???')).toBe('rpg-credencial-jogador.json')
  })
})
