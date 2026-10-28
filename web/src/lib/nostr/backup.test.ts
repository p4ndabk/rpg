import { describe, expect, it } from 'vitest'
import { idDoBackup, lerBackup, maisNovos, montarBackup } from './backup'

const PUBKEY = 'a'.repeat(64)
const SALA = 'd2722861-f671-40b5-bb41-b238c04cc853'
const evento = (tipo: 'sala' | 'jornada', id: string, em: number, conteudo = '{}') => ({ ...montarBackup(tipo, id, PUBKEY, conteudo, em) })

describe('backup nos relays', () => {
  it('monta o evento com o endereço, a pubkey de quem guarda e a marca', () => {
    const e = montarBackup('sala', SALA, PUBKEY, '{"v":1}', 100)
    expect(e.kind).toBe(30078)
    expect(e.tags).toEqual([['d', `rpg:backup:sala:${SALA}`], ['p', PUBKEY], ['t', 'rpg-backup']])
    expect(e.tags.some((t) => t[0] === 'expiration')).toBe(false)
    expect(idDoBackup('jornada', PUBKEY)).toBe(`rpg:backup:jornada:${PUBKEY}`)
  })

  it('lê o que montou, e ignora o que não é backup (a foto da sala, por exemplo)', () => {
    expect(lerBackup(evento('sala', SALA, 100, 'x'))).toEqual({ tipo: 'sala', id: SALA, em: 100, conteudo: 'x' })
    expect(lerBackup({ tags: [['d', `rpg:${SALA}`]], content: '{}', created_at: 1 })).toBeNull()
    expect(lerBackup({ tags: [['d', `rpg:backup:sala:${SALA}`]], content: '{}', created_at: 1 })).toBeNull()
    expect(lerBackup({ tags: [['d', 'rpg:backup:outro:abcdefgh'], ['t', 'rpg-backup']], content: '{}', created_at: 1 })).toBeNull()
  })

  it('fica com a cópia mais nova de cada sala e só do tipo pedido', () => {
    const outra = 'e5555555-aaaa-bbbb-cccc-ddddeeeeffff'
    const achados = [evento('sala', SALA, 100, 'velha'), evento('sala', SALA, 300, 'nova'), evento('sala', outra, 200), evento('jornada', PUBKEY, 400)]
    const salas = maisNovos(achados, 'sala')
    expect(salas.map((b) => [b.id, b.conteudo])).toEqual([[SALA, 'nova'], [outra, '{}']])
    expect(maisNovos(achados, 'jornada').map((b) => b.id)).toEqual([PUBKEY])
  })
})
