import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools'
import { describe, expect, it } from 'vitest'
import { adicionarAmigo, ehAmigo, lerAmigos, lerChaveDoAmigo, lerLinkDeAmigo, MAXIMO_AMIGOS, montarLinkDeAmigo, ordenarAmigos, removerAmigo } from './amigos'

const chave = () => getPublicKey(generateSecretKey())
const EU = chave()
const ANA = chave()

describe('lerChaveDoAmigo', () => {
  it('aceita npub, nprofile, hex e nostr:', () => {
    expect(lerChaveDoAmigo(nip19.npubEncode(ANA), EU)).toEqual({ ok: true, pubkey: ANA })
    expect(lerChaveDoAmigo(`nostr:${nip19.npubEncode(ANA)}`, EU)).toEqual({ ok: true, pubkey: ANA })
    expect(lerChaveDoAmigo(nip19.nprofileEncode({ pubkey: ANA, relays: [] }), EU)).toEqual({ ok: true, pubkey: ANA })
    expect(lerChaveDoAmigo(ANA.toUpperCase(), EU)).toEqual({ ok: true, pubkey: ANA })
  })

  it('recusa nsec, a própria chave, vazio e lixo', () => {
    expect(lerChaveDoAmigo(nip19.nsecEncode(generateSecretKey()), EU)).toEqual({ ok: false, motivo: 'segredo' })
    expect(lerChaveDoAmigo(nip19.npubEncode(EU), EU)).toEqual({ ok: false, motivo: 'propria' })
    expect(lerChaveDoAmigo('  ', EU)).toEqual({ ok: false, motivo: 'vazia' })
    expect(lerChaveDoAmigo('npub1lixo', EU)).toEqual({ ok: false, motivo: 'invalida' })
    expect(lerChaveDoAmigo(nip19.noteEncode('a'.repeat(64)), EU)).toEqual({ ok: false, motivo: 'invalida' })
  })
})

describe('lista de amigos', () => {
  it('adiciona, atualiza o nome e não duplica', () => {
    let l = adicionarAmigo([], ANA, ' Ana ', 10)
    expect(l).toEqual([{ pubkey: ANA, nome: 'Ana', desde: 10 }])
    l = adicionarAmigo(l, ANA, 'Aninha', 20)
    expect(l).toEqual([{ pubkey: ANA, nome: 'Aninha', desde: 10 }])
    expect(adicionarAmigo(l, ANA, '', 30)).toBe(l)
    expect(ehAmigo(l, ANA)).toBe(true)
  })

  it('sem nome vira "Sem nome"; remover tira da lista; ordena por nome', () => {
    const b = chave()
    let l = adicionarAmigo([], ANA, 'Zeca', 1)
    l = adicionarAmigo(l, b, '', 2)
    expect(l[1]!.nome).toBe('Sem nome')
    expect(ordenarAmigos(l).map((a) => a.nome)).toEqual(['Sem nome', 'Zeca'])
    expect(removerAmigo(l, ANA)).toHaveLength(1)
  })

  it('lista cheia não aceita novo', () => {
    const cheia = Array.from({ length: MAXIMO_AMIGOS }, (_, i) => ({ pubkey: i.toString(16).padStart(64, '0'), nome: 'x', desde: 0 }))
    expect(adicionarAmigo(cheia, ANA, 'Ana', 1)).toBe(cheia)
  })

  it('lê do armazenamento descartando lixo e repetidos', () => {
    expect(lerAmigos('x')).toBeNull()
    expect(lerAmigos([{ pubkey: ANA, nome: 'Ana', desde: 5 }, { pubkey: ANA, nome: 'Outra' }, { pubkey: 'x' }, 7, null])).toEqual([{ pubkey: ANA, nome: 'Ana', desde: 5 }])
  })
})

describe('link de amigo', () => {
  it('monta e lê de volta, com o nome', () => {
    const link = montarLinkDeAmigo('https://x.github.io/rpg/', ANA, 'Ana Lúcia')
    expect(link).toBe(`https://x.github.io/rpg/#/amigos/${nip19.npubEncode(ANA)}?nome=Ana%20L%C3%BAcia`)
    expect(lerLinkDeAmigo(link)).toEqual({ pubkey: ANA, nome: 'Ana Lúcia' })
  })

  it('sem nome também vale; lixo e nsec não', () => {
    expect(lerLinkDeAmigo(`#/amigos/${nip19.npubEncode(ANA)}`)).toEqual({ pubkey: ANA, nome: '' })
    expect(lerLinkDeAmigo('#/amigos')).toBeNull()
    expect(lerLinkDeAmigo('#/amigos/lixo')).toBeNull()
    expect(lerLinkDeAmigo(`#/amigos/${nip19.nsecEncode(generateSecretKey())}`)).toBeNull()
  })
})
